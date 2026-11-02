# The attachments converter (dl-z5ja.11.8), a container Lambda on AWS's own Python image, as
# ~/projects/lambda-docx-conversion proved it. x86_64: LibreOffice's vendor RPMs are x86_64 only.
# The owner builds and pushes it (`make image push`); an agent never does.

# --- libheif's heif-convert, built from its sha256-checked release: AL2023 packages no libheif. ---
# libde265 decodes HEVC; libheif reads the HEIF container; heif-convert (heif-dec) writes the JPEG
# through libjpeg-turbo. No encoder and no plugin is built. GPL and LGPL code runs on our server
# only, never in the browser (decision dl-n2wys).
FROM public.ecr.aws/lambda/python:3.12 AS heif

ARG AL2023_RELEASEVER=2023.12.20260918
ARG LIBDE265_VERSION=1.1.3
ARG LIBDE265_SHA256=554228bd17788c99a7e63b37ab5634722190e6e2bf60c1dcb01cef328e133905
ARG LIBHEIF_VERSION=1.23.6
ARG LIBHEIF_SHA256=4484346dc5995319dbc11e3a1c35d0a2ec46511ce370900869337fd2c7033125

RUN dnf install -y --releasever=${AL2023_RELEASEVER} cmake gcc-c++ make tar gzip libjpeg-turbo-devel \
    && dnf clean all

WORKDIR /build
RUN set -eux \
    && curl --fail --show-error --location --retry 5 --retry-all-errors -o libde265.tar.gz \
        "https://github.com/strukturag/libde265/releases/download/v${LIBDE265_VERSION}/libde265-${LIBDE265_VERSION}.tar.gz" \
    && echo "${LIBDE265_SHA256}  libde265.tar.gz" | sha256sum -c - \
    && curl --fail --show-error --location --retry 5 --retry-all-errors -o libheif.tar.gz \
        "https://github.com/strukturag/libheif/releases/download/v${LIBHEIF_VERSION}/libheif-${LIBHEIF_VERSION}.tar.gz" \
    && echo "${LIBHEIF_SHA256}  libheif.tar.gz" | sha256sum -c - \
    && tar -xzf libde265.tar.gz && tar -xzf libheif.tar.gz \
    && cmake -S "libde265-${LIBDE265_VERSION}" -B build-de265 -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_INSTALL_PREFIX=/opt -DCMAKE_INSTALL_LIBDIR=lib -DENABLE_SDL=OFF -DENABLE_ENCODER=OFF \
    && cmake --build build-de265 -j "$(nproc)" && cmake --install build-de265 \
    && cmake -S "libheif-${LIBHEIF_VERSION}" -B build-heif -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_INSTALL_PREFIX=/opt -DCMAKE_INSTALL_LIBDIR=lib -DCMAKE_PREFIX_PATH=/opt \
        -DCMAKE_INSTALL_RPATH=/opt/lib \
        -DWITH_LIBDE265=ON -DWITH_X265=OFF -DWITH_X264=OFF -DWITH_OpenH264_DECODER=OFF \
        -DWITH_AOM_DECODER=OFF -DWITH_AOM_ENCODER=OFF -DWITH_DAV1D=OFF -DWITH_SvtEnc=OFF -DWITH_RAV1E=OFF \
        -DWITH_JPEG_DECODER=OFF -DWITH_JPEG_ENCODER=OFF -DWITH_OpenJPEG_DECODER=OFF \
        -DWITH_OpenJPEG_ENCODER=OFF -DWITH_OPENJPH_ENCODER=OFF -DWITH_FFMPEG_DECODER=OFF \
        -DWITH_LIBSHARPYUV=OFF -DWITH_GDK_PIXBUF=OFF -DWITH_EXAMPLE_HEIF_VIEW=OFF \
        -DWITH_EXAMPLE_HEIF_THUMB=OFF -DENABLE_PLUGIN_LOADING=OFF -DBUILD_TESTING=OFF \
        -DBUILD_DOCUMENTATION=OFF \
    && cmake --build build-heif -j "$(nproc)" && cmake --install build-heif \
    && /opt/bin/heif-convert --version \
    && find /opt/bin -mindepth 1 ! -name heif-dec ! -name heif-convert -delete \
    && rm -rf /opt/include /opt/share /opt/lib/pkgconfig /opt/lib/cmake

# --- The Python dependencies, from uv.lock with its hashes, no dev group. ---
FROM public.ecr.aws/lambda/python:3.12 AS deps
COPY --from=ghcr.io/astral-sh/uv:0.13.5 /uv /usr/local/bin/uv
WORKDIR /build
COPY pyproject.toml uv.lock ./
RUN uv export --frozen --no-dev --no-emit-project --format requirements-txt -o requirements.txt \
    && pip install --no-cache-dir --require-hashes -r requirements.txt --target /deps

# --- The function. ---
FROM public.ecr.aws/lambda/python:3.12

# AWS advises against `--releasever=latest` in prod, so this is pinned; bump by hand for security
# fixes. poppler-utils is pdfinfo and pdftoppm; libjpeg-turbo is what heif-convert links.
ARG AL2023_RELEASEVER=2023.12.20260918
RUN dnf install -y --releasever=${AL2023_RELEASEVER} \
        xorg-x11-fonts-* libSM.x86_64 libXinerama-devel google-noto-sans-cjk-fonts \
        tar gzip xz openssl nss-tools dbus-libs cups-libs libxslt \
        poppler-utils libjpeg-turbo \
    && dnf upgrade -y --releasever=${AL2023_RELEASEVER} \
    && dnf clean all

# LibreOffice RPMs install to /opt/libreoffice<major.minor>/; SOFFICE_BIN below tracks
# LIBREOFFICE_VERSION's series, so bump them together.
ARG LIBREOFFICE_VERSION=26.2.5.2
RUN set -eux \
    && base="https://downloadarchive.documentfoundation.org/libreoffice/old/${LIBREOFFICE_VERSION}/rpm/x86_64" \
    && tarball="LibreOffice_${LIBREOFFICE_VERSION}_Linux_x86-64_rpm.tar.gz" \
    && curl --fail --show-error --location --retry 5 --retry-all-errors -O "${base}/${tarball}" \
    && curl --fail --show-error --location --retry 5 --retry-all-errors -O "${base}/${tarball}.sha256" \
    && sha256sum -c "${tarball}.sha256" \
    && tar -xzf "${tarball}" \
    && rpm -Uvh ./*/RPMS/*.rpm \
    && rm -rf LibreOffice_*

# heif-convert and its two libraries in /opt/bin and /opt/lib, which the Lambda image's
# LD_LIBRARY_PATH already reads.
COPY --from=heif /opt/ /opt/
COPY --from=deps /deps/ ${LAMBDA_TASK_ROOT}/

# HOME=/tmp: the only writable directory in the sandbox, and LibreOffice writes under it.
ENV SOFFICE_BIN=/opt/libreoffice26.2/program/soffice \
    HEIF_CONVERT_BIN=/opt/bin/heif-convert \
    PDFINFO_BIN=/usr/bin/pdfinfo \
    PDFTOPPM_BIN=/usr/bin/pdftoppm \
    HOME=/tmp \
    SOFFICE_TIMEOUT_S=75 \
    TOOL_TIMEOUT_S=30

COPY src/converter ${LAMBDA_TASK_ROOT}/converter

CMD ["converter.handler.lambda_handler"]
