import { ApiErrorResponse, ErrorDetails } from "./types";

type MessageBuilder = (details: ErrorDetails) => string;

const MESSAGE_BUILDERS_BY_CODE: Partial<Record<string, MessageBuilder>> = {
    missing_template_file: (details) =>
        `${details.config_file} includes ${details.template_file}, which wasn't uploaded. ` +
        `Add it under Logger template files.`,
    unknown_logger_template: (details) =>
        `Logger "${details.logger}" in ${details.config_file} uses the template "${details.logger_template}", ` +
        `but none of the uploaded template files define it.`,
    invalid_yaml: (details) =>
        `${details.file}${details.line ? ` (line ${details.line})` : ""} isn't valid YAML. Check the file and upload it again.`,
};

export function userMessageFor(error: ApiErrorResponse["error"]): string {
    const buildMessage = MESSAGE_BUILDERS_BY_CODE[error.code];
    return buildMessage && error.details ? buildMessage(error.details) : error.message;
}
