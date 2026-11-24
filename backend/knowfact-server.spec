# -*- mode: python ; coding: utf-8 -*-
"""
KnowFact Backend – PyInstaller spec file
Génère knowfact-server.exe (backend FastAPI standalone)
"""

import sys
from pathlib import Path

block_cipher = None

# Collecter les fichiers de données nécessaires
datas = [
    # Dossier uploads (créé vide au runtime si absent)
    # On ajoute juste un placeholder; le vrai dossier est créé au démarrage
]

# Hooks spéciaux pour FastAPI/SQLAlchemy
hiddenimports = [
    # FastAPI + Starlette
    'fastapi',
    'fastapi.middleware.cors',
    'fastapi.staticfiles',
    'starlette',
    'starlette.middleware',
    'starlette.middleware.cors',
    'starlette.staticfiles',
    'uvicorn',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    # SQLAlchemy
    'sqlalchemy',
    'sqlalchemy.dialects.sqlite',
    'sqlalchemy.orm',
    # Pydantic
    'pydantic',
    'pydantic_core',
    'pydantic.deprecated.class_validators',
    # Auth
    'jose',
    'jose.jwt',
    'passlib',
    'passlib.handlers',
    'passlib.handlers.bcrypt',
    'bcrypt',
    # Email
    'email_validator',
    # Python-multipart (file uploads)
    'multipart',
    # Routes du projet
    'routes.auth',
    'routes.fiches',
    'routes.search',
    'routes.users',
    'routes.departments',
    'routes.stats',
    'routes.gamification',
    'routes.ai_assistant',
    # Modules internes
    'database',
    'models',
    'operating_sheet',
    'ai_assistant',
]

a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'matplotlib', 'numpy', 'PIL', 'cv2'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='knowfact-server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,   # True pour voir les logs en production (passer à False pour headless)
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)
