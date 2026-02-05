# RedisHub

## Build `scorix-base-linux` Image

This base image is required to build Linux AppImage artifacts.
It contains system dependencies such as `linuxdeploy`.

Build the base image from the project root:

```bash
DOCKER_BUILDKIT=1 docker build \
  -f docker/Dockerfile_base \
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
