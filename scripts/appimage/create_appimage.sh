#!/bin/bash

# Exit on error
set -e

# Check platform
platform=$(uname)

if [[ "$platform" == "Darwin" ]]; then
    echo "Running on macOS. Note that the AppImage created will only work on Linux systems."
    if ! command -v docker &> /dev/null; then
        echo "Docker Desktop for Mac is not installed. Please install it from https://www.docker.com/products/docker-desktop"
        exit 1
    fi
elif [[ "$platform" == "Linux" ]]; then
    echo "Running on Linux. Proceeding with AppImage creation..."
else
    echo "This script is intended to run on macOS or Linux. Current platform: $platform"
    exit 1
fi

# Enable BuildKit
export DOCKER_BUILDKIT=1

BUILD_IMAGE_NAME="grid-appimage-builder"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "Docker is not running. Please start Docker first."
    exit 1
fi

# Check and install Buildx if needed
if ! docker buildx version >/dev/null 2>&1; then
    echo "Installing Docker Buildx..."
    mkdir -p ~/.docker/cli-plugins/
    curl -SL https://github.com/docker/buildx/releases/download/v0.13.1/buildx-v0.13.1.linux-amd64 -o ~/.docker/cli-plugins/docker-buildx
    chmod +x ~/.docker/cli-plugins/docker-buildx
fi

# Download appimagetool if not present
if [ ! -f "appimagetool" ]; then
    echo "Downloading appimagetool..."
    wget -O appimagetool "https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage"
    chmod +x appimagetool
fi

# Delete any existing AppImage to avoid bloating the build
rm -f GRID-x86_64.AppImage

# Create build Dockerfile
echo "Creating build Dockerfile..."
cat > Dockerfile.build << 'EOF'
# syntax=docker/dockerfile:1
FROM ubuntu:20.04

# Install required dependencies
RUN apt-get update && apt-get install -y \
    libfuse2 \
    libglib2.0-0 \
    libgtk-3-0 \
    libx11-xcb1 \
    libxss1 \
    libxtst6 \
    libnss3 \
    libasound2 \
    libdrm2 \
    libgbm1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
EOF

# Create .dockerignore file
echo "Creating .dockerignore file..."
cat > .dockerignore << EOF
Dockerfile.build
.dockerignore
.git
.gitignore
.DS_Store
*~
*.swp
*.swo
*.tmp
*.bak
*.log
*.err
node_modules/
venv/
*.egg-info/
*.tox/
dist/
EOF

# Build Docker image without cache
echo "Building Docker image (no cache)..."
docker build --no-cache -t "$BUILD_IMAGE_NAME" -f Dockerfile.build .

# Create AppImage using local appimagetool
echo "Creating AppImage..."
docker run --rm --privileged -v "$(pwd):/app" "$BUILD_IMAGE_NAME" bash -c '
cd /app && \
rm -rf GRIDApp.AppDir && \
mkdir -p GRIDApp.AppDir/usr/bin GRIDApp.AppDir/usr/lib GRIDApp.AppDir/usr/share/applications && \
find . -maxdepth 1 ! -name GRIDApp.AppDir ! -name "." ! -name ".." -exec cp -r {} GRIDApp.AppDir/usr/bin/ \; && \
cp grid.png GRIDApp.AppDir/ && \
echo "[Desktop Entry]" > GRIDApp.AppDir/grid.desktop && \
echo "Name=GRID" >> GRIDApp.AppDir/grid.desktop && \
echo "Comment=Open source AI code editor." >> GRIDApp.AppDir/grid.desktop && \
echo "GenericName=Text Editor" >> GRIDApp.AppDir/grid.desktop && \
echo "Exec=grid %F" >> GRIDApp.AppDir/grid.desktop && \
echo "Icon=grid" >> GRIDApp.AppDir/grid.desktop && \
echo "Type=Application" >> GRIDApp.AppDir/grid.desktop && \
echo "StartupNotify=false" >> GRIDApp.AppDir/grid.desktop && \
echo "StartupWMClass=GRID" >> GRIDApp.AppDir/grid.desktop && \
echo "Categories=TextEditor;Development;IDE;" >> GRIDApp.AppDir/grid.desktop && \
echo "MimeType=application/x-grid-workspace;" >> GRIDApp.AppDir/grid.desktop && \
echo "Keywords=grid;" >> GRIDApp.AppDir/grid.desktop && \
echo "Actions=new-empty-window;" >> GRIDApp.AppDir/grid.desktop && \
echo "[Desktop Action new-empty-window]" >> GRIDApp.AppDir/grid.desktop && \
echo "Name=New Empty Window" >> GRIDApp.AppDir/grid.desktop && \
echo "Name[de]=Neues leeres Fenster" >> GRIDApp.AppDir/grid.desktop && \
echo "Name[es]=Nueva ventana vacía" >> GRIDApp.AppDir/grid.desktop && \
echo "Name[fr]=Nouvelle fenêtre vide" >> GRIDApp.AppDir/grid.desktop && \
echo "Name[it]=Nuova finestra vuota" >> GRIDApp.AppDir/grid.desktop && \
echo "Name[ja]=新しい空のウィンドウ" >> GRIDApp.AppDir/grid.desktop && \
echo "Name[ko]=새 빈 창" >> GRIDApp.AppDir/grid.desktop && \
echo "Name[ru]=Новое пустое окно" >> GRIDApp.AppDir/grid.desktop && \
echo "Name[zh_CN]=新建空窗口" >> GRIDApp.AppDir/grid.desktop && \
echo "Name[zh_TW]=開新空視窗" >> GRIDApp.AppDir/grid.desktop && \
echo "Exec=grid --new-window %F" >> GRIDApp.AppDir/grid.desktop && \
echo "Icon=grid" >> GRIDApp.AppDir/grid.desktop && \
chmod +x GRIDApp.AppDir/grid.desktop && \
cp GRIDApp.AppDir/grid.desktop GRIDApp.AppDir/usr/share/applications/ && \
echo "[Desktop Entry]" > GRIDApp.AppDir/grid-url-handler.desktop && \
echo "Name=GRID - URL Handler" >> GRIDApp.AppDir/grid-url-handler.desktop && \
echo "Comment=Open source AI code editor." >> GRIDApp.AppDir/grid-url-handler.desktop && \
echo "GenericName=Text Editor" >> GRIDApp.AppDir/grid-url-handler.desktop && \
echo "Exec=grid --open-url %U" >> GRIDApp.AppDir/grid-url-handler.desktop && \
echo "Icon=grid" >> GRIDApp.AppDir/grid-url-handler.desktop && \
echo "Type=Application" >> GRIDApp.AppDir/grid-url-handler.desktop && \
echo "NoDisplay=true" >> GRIDApp.AppDir/grid-url-handler.desktop && \
echo "StartupNotify=true" >> GRIDApp.AppDir/grid-url-handler.desktop && \
echo "Categories=Utility;TextEditor;Development;IDE;" >> GRIDApp.AppDir/grid-url-handler.desktop && \
echo "MimeType=x-scheme-handler/grid;" >> GRIDApp.AppDir/grid-url-handler.desktop && \
echo "Keywords=grid;" >> GRIDApp.AppDir/grid-url-handler.desktop && \
chmod +x GRIDApp.AppDir/grid-url-handler.desktop && \
cp GRIDApp.AppDir/grid-url-handler.desktop GRIDApp.AppDir/usr/share/applications/ && \
echo "#!/bin/bash" > GRIDApp.AppDir/AppRun && \
echo "HERE=\$(dirname \"\$(readlink -f \"\${0}\")\")" >> GRIDApp.AppDir/AppRun && \
echo "export PATH=\${HERE}/usr/bin:\${PATH}" >> GRIDApp.AppDir/AppRun && \
echo "export LD_LIBRARY_PATH=\${HERE}/usr/lib:\${LD_LIBRARY_PATH}" >> GRIDApp.AppDir/AppRun && \
echo "exec \${HERE}/usr/bin/grid --no-sandbox \"\$@\"" >> GRIDApp.AppDir/AppRun && \
chmod +x GRIDApp.AppDir/AppRun && \
chmod -R 755 GRIDApp.AppDir && \

# Strip unneeded symbols from the binary to reduce size
strip --strip-unneeded GRIDApp.AppDir/usr/bin/grid

ls -la GRIDApp.AppDir/ && \
ARCH=x86_64 ./appimagetool -n GRIDApp.AppDir GRID-x86_64.AppImage
'

# Clean up
rm -rf GRIDApp.AppDir .dockerignore appimagetool

echo "AppImage creation complete! Your AppImage is: GRID-x86_64.AppImage"
