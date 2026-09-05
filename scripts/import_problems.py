"""Importa problemas y casos de prueba del dataset APPS en PostgreSQL."""

import os
import re
import json
from getpass import getpass

import psycopg2
from datasets import load_dataset
from psycopg2.extras import execute_values
from tqdm import tqdm


DB_CONFIG = {
    "dbname": os.getenv("PGDATABASE", "tu_base_de_datos"),
    "user": os.getenv("PGUSER", "postgres"),
    "password": os.getenv("PGPASSWORD"),
    "host": os.getenv("PGHOST", "localhost"),
    "port": os.getenv("PGPORT", "5432"),
    "options": "-c lc_messages=C",
}

DATASET_NAME = "DenCT/codeforces-problems-7k"
CODEFORCES_RATINGS_FILE = "codeforces-problems.json"


def conectar_db():
    config = DB_CONFIG.copy()
    if not config["password"]:
        config["password"] = getpass("Contraseña de PostgreSQL: ")
    return psycopg2.connect(**config)


def crear_slug(title, problem_id):
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    slug = slug[:180] or "problem"
    return f"{slug}-{str(problem_id).lower()}"[:220]


def valores_casos(item):
    input_output = item.get("input_output") or {}
    if not isinstance(input_output, list):
        return []
    return [
        (str(case.get("input", "")), str(case.get("output", "")), index > 1)
        for index, case in enumerate(input_output)
        if isinstance(case, dict) and "output" in case
    ]


def obtener_numero(item, fallback):
    try:
        return int(item.get("__index_level_0__", fallback)) + 1
    except (TypeError, ValueError):
        return fallback


def limite_numerico(value, default):
    match = re.search(r"\d+(?:\.\d+)?", str(value or ""))
    return float(match.group()) if match else default


def cargar_ratings_codeforces():
    with open(CODEFORCES_RATINGS_FILE, encoding="utf-8") as file:
        data = json.load(file)

    ratings = {}
    for problem in data.get("result", {}).get("problems", []):
        rating = problem.get("rating")
        if rating is not None:
            key = (problem.get("contestId"), str(problem.get("name", "")).strip().casefold())
            ratings[key] = int(rating)
    return ratings


def cargar_y_migrar():
    print("Conectando a PostgreSQL...")
    with conectar_db() as conn, conn.cursor() as cursor:
        print("Descargando el dataset desde Hugging Face...")
        dataset = load_dataset(DATASET_NAME, split="train")
        ratings = cargar_ratings_codeforces()
        print(f"Total de problemas encontrados: {len(dataset)}")
        print(f"Ratings de Codeforces disponibles: {len(ratings)}")

        for index, item in enumerate(tqdm(dataset, desc="Importando problemas"), 1):
            try:
                problem_key = item.get("name") or index
                problem_number = obtener_numero(item, index)
                title = str(problem_key)[:200]
                slug = crear_slug(title, problem_number)
                description = "\n\n".join(
                    str(item.get(field) or "")
                    for field in (
                        "problem-description",
                        "input-specification",
                        "output-specification",
                        "note",
                    )
                    if item.get(field)
                )
                rating_key = (item.get("contestId"), str(problem_key).strip().casefold())
                difficulty_rating = ratings.get(rating_key, 1200)
                time_limit = limite_numerico(item.get("time-limit"), 2.0)
                memory_limit = int(limite_numerico(item.get("memory-limit"), 256))

                cursor.execute(
                    """
                    INSERT INTO problems
                                            (problem_number, title, slug, description_markdown,
                                             difficulty_rating, time_limit_sec, memory_limit_mb, is_active)
                                        VALUES (%s, %s, %s, %s, %s, %s, %s, true)
                    ON CONFLICT (slug) DO UPDATE SET
                                            problem_number = EXCLUDED.problem_number,
                      title = EXCLUDED.title,
                      description_markdown = EXCLUDED.description_markdown,
                      difficulty_rating = EXCLUDED.difficulty_rating,
                      time_limit_sec = EXCLUDED.time_limit_sec,
                      memory_limit_mb = EXCLUDED.memory_limit_mb,
                      is_active = true
                    RETURNING id;
                    """,
                    (problem_number, title, slug, description, difficulty_rating, time_limit, memory_limit),
                )
                problem_id = cursor.fetchone()[0]

                tags = item.get("tags") or ["implementation"]
                if isinstance(tags, str):
                    tags = [tags]
                for tag_name in tags:
                    tag_name = str(tag_name)[:80]
                    cursor.execute(
                        """
                        INSERT INTO tags (name, description)
                        VALUES (%s, %s)
                        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                        RETURNING id;
                        """,
                        (tag_name, f"Categoría {tag_name}"),
                    )
                    tag_id = cursor.fetchone()[0]
                    cursor.execute(
                        """
                        INSERT INTO problem_tags (problem_id, tag_id)
                        VALUES (%s, %s)
                        ON CONFLICT DO NOTHING;
                        """,
                        (problem_id, tag_id),
                    )

                item["input_output"] = item.get("test_cases")
                cases = valores_casos(item)
                if cases:
                    execute_values(
                        cursor,
                        """
                        INSERT INTO test_cases
                          (problem_id, input, expected_output, is_hidden)
                        VALUES %s
                        ON CONFLICT (problem_id, md5(input), md5(expected_output))
                        DO NOTHING;
                        """,
                        [(problem_id, *case) for case in cases],
                    )

                if index % 50 == 0:
                    conn.commit()
            except Exception as error:
                conn.rollback()
                print(f"Problema omitido ({index}): {error}")

        conn.commit()
    print("\nMigración completa exitosamente.")


if __name__ == "__main__":
    cargar_y_migrar()