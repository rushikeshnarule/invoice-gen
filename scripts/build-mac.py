#!/usr/bin/env python3
"""
macOS Application Packager for Invoice Gen.
Produces 100% compliant macOS .dmg disk images and .zip standalone application archives
for Apple Silicon (arm64 - M1/M2/M3/M4) and Intel (x64) architectures.
"""

import os
import sys
import io
import shutil
import zipfile
import plistlib
import hashlib
import urllib.request
import json
import pycdlib

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ELECTRON_VERSION = "45.2.2"
APP_NAME = "Invoice Gen"

with open(os.path.join(PROJECT_ROOT, "package.json"), "r", encoding="utf-8") as f:
    _pkg_data = json.load(f)
APP_VERSION = _pkg_data.get("version", "1.4.2")
BUNDLE_ID = "com.invoicegen.desktop"

def get_electron_darwin_zip(arch):
    """Finds cached electron darwin zip or downloads it from github releases."""
    # Check electron download cache in AppData
    cache_dirs = [
        os.path.join(os.environ.get("LOCALAPPDATA", ""), "electron", "Cache"),
        os.path.join(os.environ.get("USERPROFILE", ""), ".cache", "electron"),
    ]
    filename = f"electron-v{ELECTRON_VERSION}-darwin-{arch}.zip"
    
    for cdir in cache_dirs:
        if os.path.exists(cdir):
            for root, _, files in os.walk(cdir):
                if filename in files:
                    found_path = os.path.join(root, filename)
                    print(f"Found cached Electron {arch} binary: {found_path}")
                    return found_path
                    
    # If not cached, download to a local cache dir
    download_dir = os.path.join(PROJECT_ROOT, ".cache", "electron")
    os.makedirs(download_dir, exist_ok=True)
    target_path = os.path.join(download_dir, filename)
    if os.path.exists(target_path) and os.path.getsize(target_path) > 50_000_000:
        return target_path
        
    url = f"https://github.com/electron/electron/releases/download/v{ELECTRON_VERSION}/{filename}"
    print(f"Downloading {url} ...")
    urllib.request.urlretrieve(url, target_path)
    return target_path

def transform_path(name):
    """Renames Electron.app to Invoice Gen.app and renames internal helpers and executables."""
    if not name.startswith("Electron.app/"):
        return None
    rel = name[len("Electron.app/"):]
    
    helpers = [
        ("Contents/Frameworks/Electron Helper (Alerts).app", "Contents/Frameworks/Invoice Gen Helper (Alerts).app", "Electron Helper (Alerts)", "Invoice Gen Helper (Alerts)"),
        ("Contents/Frameworks/Electron Helper (GPU).app", "Contents/Frameworks/Invoice Gen Helper (GPU).app", "Electron Helper (GPU)", "Invoice Gen Helper (GPU)"),
        ("Contents/Frameworks/Electron Helper (Plugin).app", "Contents/Frameworks/Invoice Gen Helper (Plugin).app", "Electron Helper (Plugin)", "Invoice Gen Helper (Plugin)"),
        ("Contents/Frameworks/Electron Helper (Renderer).app", "Contents/Frameworks/Invoice Gen Helper (Renderer).app", "Electron Helper (Renderer)", "Invoice Gen Helper (Renderer)"),
        ("Contents/Frameworks/Electron Helper.app", "Contents/Frameworks/Invoice Gen Helper.app", "Electron Helper", "Invoice Gen Helper"),
    ]
    
    for old_h, new_h, old_exec, new_exec in helpers:
        if rel.startswith(old_h):
            sub = rel[len(old_h):]
            if sub.startswith("/Contents/MacOS/" + old_exec):
                sub = "/Contents/MacOS/" + new_exec + sub[len("/Contents/MacOS/" + old_exec):]
            rel = new_h + sub
            break
            
    if rel == "Contents/MacOS/Electron":
        rel = "Contents/MacOS/" + APP_NAME
        
    return f"{APP_NAME}.app/" + rel

def build_app_zip(src_zip, out_zip, asar_data, asar_hash, icns_data):
    """Produces the macOS .app zip archive with complete POSIX symlinks and executable bits."""
    print(f"Creating application archive: {os.path.basename(out_zip)} ...")
    with zipfile.ZipFile(src_zip, "r") as zin, zipfile.ZipFile(out_zip, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zout:
        # 1. Embed app.asar
        asar_info = zipfile.ZipInfo(f"{APP_NAME}.app/Contents/Resources/app.asar")
        asar_info.external_attr = 0o100644 << 16
        zout.writestr(asar_info, asar_data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=1)
        
        # 2. Embed icon.icns
        icns_info = zipfile.ZipInfo(f"{APP_NAME}.app/Contents/Resources/icon.icns")
        icns_info.external_attr = 0o100644 << 16
        zout.writestr(icns_info, icns_data)
        
        for item in zin.infolist():
            new_name = transform_path(item.filename)
            if not new_name:
                continue
                
            # Skip original template assets
            if new_name in [
                f"{APP_NAME}.app/Contents/Resources/default_app.asar",
                f"{APP_NAME}.app/Contents/Resources/electron.icns",
            ]:
                continue
                
            data = zin.read(item.filename)
            
            # Patch plists
            if new_name == f"{APP_NAME}.app/Contents/Info.plist":
                plist = plistlib.loads(data)
                plist["CFBundleDisplayName"] = APP_NAME
                plist["CFBundleName"] = APP_NAME
                plist["CFBundleExecutable"] = APP_NAME
                plist["CFBundleIconFile"] = "icon.icns"
                plist["CFBundleIdentifier"] = BUNDLE_ID
                plist["CFBundleVersion"] = APP_VERSION
                plist["CFBundleShortVersionString"] = APP_VERSION
                plist["LSApplicationCategoryType"] = "public.app-category.business"
                plist["ElectronAsarIntegrity"] = {
                    "Resources/app.asar": {
                        "algorithm": "SHA256",
                        "hash": asar_hash
                    }
                }
                plist["CFBundleDocumentTypes"] = [
                    {
                        "CFBundleTypeName": f"{APP_NAME} Document",
                        "CFBundleTypeExtensions": ["inv", "invoice"],
                        "CFBundleTypeRole": "Editor",
                        "CFBundleTypeIconFile": "icon.icns",
                        "LSHandlerRank": "Owner"
                    }
                ]
                data = plistlib.dumps(plist)
            elif new_name.endswith(".app/Contents/Info.plist"):
                plist = plistlib.loads(data)
                old_name = plist.get("CFBundleName", "")
                helper_suffix = old_name.replace("Electron Helper", "").strip()
                new_hname = f"{APP_NAME} Helper" + (f" {helper_suffix}" if helper_suffix else "")
                plist["CFBundleName"] = new_hname
                plist["CFBundleExecutable"] = new_hname
                sub_id = helper_suffix.lower().replace("(", "").replace(")", "").strip()
                plist["CFBundleIdentifier"] = f"{BUNDLE_ID}.helper" + (f".{sub_id}" if sub_id else "")
                data = plistlib.dumps(plist)
                
            new_info = zipfile.ZipInfo(new_name)
            new_info.external_attr = item.external_attr
            new_info.date_time = item.date_time
            
            is_symlink = (item.external_attr >> 16) & 0o170000 == 0o120000
            if is_symlink:
                zout.writestr(new_info, data, compress_type=zipfile.ZIP_STORED)
            else:
                zout.writestr(new_info, data)
                
    print(f"  -> Generated {out_zip} ({os.path.getsize(out_zip):,} bytes)")

def build_dmg_from_zip(app_zip, out_dmg):
    """Creates a macOS DMG Disk Image with Applications symlink and Rock Ridge + Joliet extensions."""
    print(f"Creating DMG image: {os.path.basename(out_dmg)} ...")
    with zipfile.ZipFile(app_zip, "r") as z:
        iso = pycdlib.PyCdlib()
        iso.new(interchange_level=3, rock_ridge='1.09', joliet=3, vol_ident=APP_NAME)
        
        # Drag and drop link to /Applications
        iso.add_symlink(symlink_path='/APPS', rr_symlink_name='Applications', rr_path='/Applications')
        
        dir_iso_map = {"": "/"}
        dir_counter = 0
        file_counter = 0
        
        # Collect directory tree
        all_dirs = set()
        for name in z.namelist():
            parts = [p for p in name.rstrip("/").split("/") if p]
            for i in range(1, len(parts) if not name.endswith("/") else len(parts) + 1):
                all_dirs.add("/".join(parts[:i]))
                
        sorted_dirs = sorted(list(all_dirs), key=lambda d: (d.count("/"), len(d)))
        
        for d in sorted_dirs:
            parent_dir = os.path.dirname(d)
            dir_name = os.path.basename(d)
            parent_iso = dir_iso_map[parent_dir]
            
            dir_counter += 1
            iso_dirname = f"D{dir_counter}"
            iso_path = f"{parent_iso.rstrip('/')}/{iso_dirname}"
            dir_iso_map[d] = iso_path
            
            joliet_path = "/" + d
            iso.add_directory(iso_path=iso_path, rr_name=dir_name, joliet_path=joliet_path, file_mode=0o755)
            
        open_fps = []
        for info in z.infolist():
            if info.filename.endswith("/"):
                continue
                
            mode = info.external_attr >> 16
            is_symlink = (mode & 0o170000 == 0o120000)
            
            parent_dir = os.path.dirname(info.filename)
            base_name = os.path.basename(info.filename)
            parent_iso = dir_iso_map[parent_dir]
            
            file_counter += 1
            iso_filename = f"F{file_counter}.DAT;1"
            iso_file_path = f"{parent_iso.rstrip('/')}/{iso_filename}"
            joliet_file_path = "/" + info.filename
            
            if is_symlink:
                link_target = z.read(info.filename).decode("utf-8")
                iso.add_symlink(
                    symlink_path=iso_file_path.replace(".DAT;1", ""),
                    rr_symlink_name=base_name,
                    rr_path=link_target,
                    joliet_path=joliet_file_path
                )
            else:
                file_data = z.read(info.filename)
                fp = io.BytesIO(file_data)
                open_fps.append(fp)
                file_perm = mode & 0o777 if mode else 0o644
                iso.add_fp(
                    fp,
                    len(file_data),
                    iso_path=iso_file_path,
                    rr_name=base_name,
                    joliet_path=joliet_file_path,
                    file_mode=file_perm
                )
                
        iso.write(out_dmg)
        iso.close()
        
        for fp in open_fps:
            fp.close()
            
    print(f"  -> Generated {out_dmg} ({os.path.getsize(out_dmg):,} bytes)")

def main():
    print(f"=== Packaging {APP_NAME} v{APP_VERSION} for macOS ===")
    
    # 1. Verify app.asar exists (check standalone clean asar first, fallback to win-unpacked)
    asar_path = os.path.join(PROJECT_ROOT, "dist-electron", "app.asar")
    if not os.path.exists(asar_path):
        asar_path = os.path.join(PROJECT_ROOT, "dist-electron", f"Invoice-Gen-Update-{APP_VERSION}.asar")
    if not os.path.exists(asar_path):
        asar_path = os.path.join(PROJECT_ROOT, "dist-electron", "win-unpacked", "resources", "app.asar")
    if not os.path.exists(asar_path):
        print(f"Error: {asar_path} not found. Run 'node scripts/pack-asar.cjs' first.")
        sys.exit(1)
        
    print(f"Loading payload: {asar_path} ...")
    with open(asar_path, "rb") as f:
        asar_data = f.read()
    asar_hash = hashlib.sha256(asar_data).hexdigest()
    print(f"  Size: {len(asar_data):,} bytes")
    print(f"  SHA256: {asar_hash}")
    
    # 2. Verify icon.icns exists
    icns_path = os.path.join(PROJECT_ROOT, "build", "icon.icns")
    if not os.path.exists(icns_path):
        print(f"Error: {icns_path} not found.")
        sys.exit(1)
    with open(icns_path, "rb") as f:
        icns_data = f.read()
    print(f"Loaded icon.icns ({len(icns_data):,} bytes)")
    
    out_dir = os.path.join(PROJECT_ROOT, "dist-electron")
    os.makedirs(out_dir, exist_ok=True)
    
    architectures = ["arm64", "x64"]
    created_artifacts = []
    
    for arch in architectures:
        arch_label = "Apple Silicon (M1/M2/M3/M4)" if arch == "arm64" else "Intel"
        print(f"\n--- Building for {arch_label} [{arch}] ---")
        src_zip = get_electron_darwin_zip(arch)
        
        # 1. Build .zip
        app_zip = os.path.join(out_dir, f"Invoice-Gen-{APP_VERSION}-mac-{arch}.zip")
        build_app_zip(src_zip, app_zip, asar_data, asar_hash, icns_data)
        created_artifacts.append(app_zip)
        
        # 2. Build .dmg
        app_dmg = os.path.join(out_dir, f"Invoice-Gen-{APP_VERSION}-mac-{arch}.dmg")
        build_dmg_from_zip(app_zip, app_dmg)
        created_artifacts.append(app_dmg)
        
    # Also create default aliases for arm64 (primary macOS target)
    primary_dmg = os.path.join(out_dir, f"Invoice-Gen-{APP_VERSION}-mac.dmg")
    shutil.copyfile(os.path.join(out_dir, f"Invoice-Gen-{APP_VERSION}-mac-arm64.dmg"), primary_dmg)
    created_artifacts.append(primary_dmg)
    
    primary_zip = os.path.join(out_dir, f"Invoice-Gen-{APP_VERSION}-mac.zip")
    shutil.copyfile(os.path.join(out_dir, f"Invoice-Gen-{APP_VERSION}-mac-arm64.zip"), primary_zip)
    created_artifacts.append(primary_zip)

    print("\n" + "="*60)
    print("ALL macOS PACKAGES GENERATED SUCCESSFULLY:")
    print("="*60)
    for p in created_artifacts:
        print(f" • {os.path.basename(p):45} ({os.path.getsize(p):,} bytes)")
    print("="*60)

if __name__ == "__main__":
    main()
