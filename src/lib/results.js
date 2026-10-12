/**
 * Hasil operasi yang seragam untuk Server Action.
 * Semua action mengembalikan { ok, message, fieldErrors, data }.
 */

export function actionOk(message = null, data = null) {
  return { ok: true, message, fieldErrors: null, data };
}

export function actionFail(message, fieldErrors = null) {
  return { ok: false, message, fieldErrors, data: null };
}

export function fromParseError(parsed) {
  return actionFail(parsed.message, parsed.fieldErrors);
}
