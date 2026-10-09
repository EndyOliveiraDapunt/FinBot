#!/usr/bin/env python3
import json
import urllib.request
import sys

PROJECT_REF = "dqigaogendvfytahnpfj"
TOKEN = "sbp_oauth_5b69519bc725ce9b9b9c961facfcde1b2272dbfd"

def run_sql(sql_query: str):
    url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }
    payload = json.dumps({"query": sql_query}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read().decode("utf-8")
            return True, data
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode("utf-8")
        return False, f"HTTP {e.code}: {error_msg}"
    except Exception as e:
        return False, str(e)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python3 apply_migration.py <caminho_do_arquivo.sql>")
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
