# Gzip's js, css, and htm files and generates
# PROGMEM byte arrays in cpp header files in the 
# detector/software/OpenLapDetector directory

import sys
import os
import gzip
import shutil

paths = [
    "../web/js/openlap.js",
    "../web/css/openlap.css",
    "../web/css/pure-min.css",
    "../web/index.htm",
     "../web/settings.htm",
    ]

dest = "../detector/software/OpenLapDetector"
destPath = os.path.join(dest, "openlap_gz.h")
destDefine = "_openlap_gz_h_"

os.chdir(os.path.dirname(os.path.abspath(__file__)))

cppFiles = []

for path in paths:
    print("Processing file " + path)
    if not os.path.exists(path):
        print("The file does not exist")
        sys.exit(1)

    head ,tail = os.path.split(path)
    gzipName = tail + ".gz"
    gzipPath = os.path.join(head, gzipName)

    with open(path, "rb") as f:
        with gzip.open(gzipPath, "wb", 6) as g:
            shutil.copyfileobj(f, g)

    size = os.path.getsize(gzipPath)
    bytes = bytearray(size)

    with open(gzipPath, "rb") as f:
        f.readinto(bytes)

    arrayName = gzipName.replace('.','_').replace('-', '_')
    cppName = arrayName + ".h"
    defineName = "_" + arrayName + "_h_"
    headerPath = os.path.join(dest, cppName)

    with open(headerPath, "w") as f:
        f.write("#ifndef " + defineName + "\n")
        f.write("#define " + defineName + "\n")
        f.write("#define " + arrayName + "_len " + str(size) + "\n")
        f.write("const uint8_t " + arrayName + "[] PROGMEM = {")
        for byte in bytes:
            f.write("0x%02x, " % byte)
        f.write("};" + "\n")
        f.write("#endif")

    os.remove(gzipPath)
    cppFiles.append(cppName)

with open(destPath, "w") as f:
    f.write("#ifndef " + destDefine + "\n")
    f.write("#define " + destDefine + "\n")
    for n in cppFiles:
        f.write("#include \"" + n + "\"\n")
    f.write("#endif")