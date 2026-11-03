# The print Lambda (dl-1eieq.8.2), a container Lambda on AWS's own Python image, in the converter's
# shape. arm64: WeasyPrint needs only pango, which AL2023 packages for both architectures.
# The owner builds and pushes it (`make image image-check push`); an agent never does.

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
# fixes. pango brings harfbuzz, fontconfig and gobject, all WeasyPrint loads. DejaVu draws the few
# signs Andika has no glyph for (the ✓ in the answer card's note).
ARG AL2023_RELEASEVER=2023.12.20260918
RUN dnf install -y --releasever=${AL2023_RELEASEVER} pango dejavu-sans-fonts dejavu-sans-mono-fonts \
    && dnf upgrade -y --releasever=${AL2023_RELEASEVER} \
    && dnf clean all

COPY --from=deps /deps/ ${LAMBDA_TASK_ROOT}/

# HOME and fontconfig's cache in /tmp: the only writable directory in the sandbox.
ENV HOME=/tmp \
    XDG_CACHE_HOME=/tmp/.cache

# The package, its templates and its fonts (src/printer/assets).
COPY src/printer ${LAMBDA_TASK_ROOT}/printer

CMD ["printer.handler.lambda_handler"]
