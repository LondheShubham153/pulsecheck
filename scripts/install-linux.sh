#!/usr/bin/env bash
set -e

arch=$(uname -m | sed 's/x86_64/amd64/; s/aarch64/arm64/')

curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"

curl -fsSLo kind "https://kind.sigs.k8s.io/dl/v0.32.0/kind-linux-$arch"
sudo install kind /usr/local/bin/kind
rm kind

version=$(curl -fsSL https://dl.k8s.io/release/stable.txt)
curl -fsSLo kubectl "https://dl.k8s.io/release/$version/bin/linux/$arch/kubectl"
sudo install kubectl /usr/local/bin/kubectl
rm kubectl

command -v make >/dev/null || sudo apt-get install -y make || sudo dnf install -y make

echo "Done. Log out and back in, then run: make preflight"
