FROM public.ecr.aws/lambda/python:3.12

# graphviz provides the `dot` binary the renderer calls; git is needed to install the tool from GitHub
RUN dnf install -y graphviz git && dnf clean all

COPY pyproject.toml ${LAMBDA_TASK_ROOT}/
COPY src ${LAMBDA_TASK_ROOT}/src
RUN pip install --no-cache-dir ${LAMBDA_TASK_ROOT}

CMD ["openrvdas_diagram_lambda.handler.handle"]
