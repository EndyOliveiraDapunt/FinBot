#!/usr/bin/env python3
"""Aplica um arquivo SQL no projeto Supabase pela Management API.

Uso:
    SUPABASE_ACCESS_TOKEN=sbp_... python3 scripts/apply_migration.py supabase/migrations/arquivo.sql

O token nunca deve ficar no código. Gere um Personal Access Token em
Supabase Dashboard > Account > Access Tokens e passe por variável de ambiente.
"""
import json
import os
import sys
import urllib.error
import urllib.request

PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "dqigaogendvfytahnpfj")
TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN")


def run_sql(sql_query: str):
    url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json",
    }
    payload = json.dumps({"query": sql_query}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return True, resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}: {e.read().decode('utf-8')}"
    except Exception as e:  # noqa: BLE001
        return False, str(e)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python3 apply_migration.py <caminho_do_arquivo.sql>")
        sys.exit(1)
    if not TOKEN:
        print("Defina SUPABASE_ACCESS_TOKEN no ambiente.")
        sys.exit(1)

    file_path = sys.argv[1]
    with open(file_path, "r", encoding="utf-8") as f:
        sql = f.read()

    print(f"Executando migração: {file_path} no projeto {PROJECT_REF}...")
    success, result = run_sql(sql)
    if success:
        print("✅ Migração aplicada com sucesso!")
        print(result)
    else:
        print("❌ Erro ao aplicar migração:")
        print(result)
        sys.exit(1)
