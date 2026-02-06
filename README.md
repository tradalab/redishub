# RedisHub

## Local Development

You can run RedisHub locally for development.

```shell
bash scripts/dev.sh
```

## Build `scorix-base-linux` Image

This base image is required to build Linux AppImage artifacts.
It contains system dependencies such as `linuxdeploy`.

Build the base image from the project root:

```bash
DOCKER_BUILDKIT=1 docker build \
  -f docker/Dockerfile_baselinux \
  -t ghcr.io/tradalab/scorix-base-linux:latest \
  .
````

## Build AppImage

Build Linux AppImage

The Linux AppImage is built as a pure artifact image.
The final Docker stage uses FROM scratch and cannot be run.

Build and export the AppImage directly to the local filesystem:

```shell
docker buildx build \
  -f docker/Dockerfile_linux \
  --target artifacts \
  --output type=local,dest=./artifacts \
  .
```

After a successful build, the output will be available at:

```text
./artifacts/
└── RedisHub-x.y.z-x86_64.AppImage
```

## Build `scorix-base-windows` Image

This base image is required to build Windows MSI artifacts.
It contains system dependencies such as `Wix` `Go` `Nodejs` `Git`.

Build the base image from the project root:

```bash
DOCKER_BUILDKIT=0 docker build \
  -f docker/Dockerfile_basewindows \
  -t ghcr.io/tradalab/scorix-base-windows:latest \
  .
````

## Build MSI

REQUIREMENTS:
- Docker Desktop switched to **Windows containers**
- Hyper-V enabled

```shell
DOCKER_BUILDKIT=0 docker build \
    -f docker/Dockerfile_windows \
    --target artifacts \
    --output type=local,dest=./artifacts \
    .
```

```shell
DOCKER_BUILDKIT=0 docker build --platform windows/amd64 -f docker/Dockerfile_windows .
```

