/**
 * Conservative, dependency-free OpenAPI 3.x response verifier.
 * Supported subset: explicit response status, application/json, object schemas,
 * required properties and scalar types, nested object properties, arrays, enum.
 * Unsupported schema constructs never count as a pass.
 */
const own = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
const supportedTypes = new Set(['object', 'array', 'string', 'integer', 'number', 'boolean', 'null']);
export function validateValue(schema, value, path = '$') {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema) ||
      typeof schema.$ref === 'string' || schema.oneOf || schema.anyOf ||
      schema.allOf || schema.not || schema.nullable === true) {
    return [{ code: 'UNSUPPORTED_SCHEMA', path }];
  }
  if (!supportedTypes.has(schema.type)) return [{ code: 'UNSUPPORTED_SCHEMA', path }];
  const valid = {
    object: value !== null && typeof value === 'object' && !Array.isArray(value),
    array: Array.isArray(value),
    string: typeof value === 'string',
    integer: Number.isInteger(value),
    number: typeof value === 'number' && Number.isFinite(value),
    boolean: typeof value === 'boolean',
    null: value === null
  }[schema.type];
  if (!valid) return [{ code: 'TYPE_MISMATCH', path, expected: schema.type }];
  const violations = [];
  if (own(schema, 'enum')) {
    if (!Array.isArray(schema.enum)) return [{ code: 'UNSUPPORTED_SCHEMA', path }];
    if (!schema.enum.some(v => Object.is(v, value))) violations.push({ code: 'ENUM_MISMATCH', path });
  }
  if (schema.type === 'object') {
    if (schema.required && !Array.isArray(schema.required)) return [{ code: 'UNSUPPORTED_SCHEMA', path }];
    if (schema.properties && (typeof schema.properties !== 'object' || Array.isArray(schema.properties))) {
      return [{ code: 'UNSUPPORTED_SCHEMA', path }];
    }
    for (const key of schema.required || []) {
      if (typeof key !== 'string') return [{ code: 'UNSUPPORTED_SCHEMA', path }];
      if (!own(value, key)) violations.push({ code: 'MISSING_REQUIRED', path: `${path}.${key}` });
    }
    for (const [key, child] of Object.entries(schema.properties || {})) {
      if (own(value, key)) violations.push(...validateValue(child, value[key], `${path}.${key}`));
    }
  }
  if (schema.type === 'array') {
    if (!schema.items) return [{ code: 'UNSUPPORTED_SCHEMA', path }];
    value.forEach((item, i) => violations.push(...validateValue(schema.items, item, `${path}[${i}]`)));
  }
  return violations;
}

export function verifyResponse({ spec, method, path, response }) {
  if (!spec || !String(spec.openapi || '').startsWith('3.') || !spec.paths ||
      typeof method !== 'string' || typeof path !== 'string' ||
      !response || !Number.isInteger(response.status)) {
    return { state: 'UNKNOWN', violations: [{ code: 'INVALID_INPUT' }] };
  }
  const operation = spec.paths[path]?.[method.toLowerCase()];
  if (!operation || !operation.responses) return { state: 'UNKNOWN', violations: [{ code: 'NO_OPERATION' }] };
  const definition = operation.responses[String(response.status)];
  if (!definition) return { state: 'FAIL', violations: [{ code: 'UNEXPECTED_STATUS', actual: response.status }] };
  const schema = definition.content?.['application/json']?.schema;
  if (!schema) return { state: 'UNKNOWN', violations: [{ code: 'NO_SUPPORTED_JSON_SCHEMA' }] };
  let json = response.body;
  if (typeof json === 'string') {
    try { json = JSON.parse(json); }
    catch { return { state: 'FAIL', violations: [{ code: 'INVALID_JSON' }] }; }
  }
  const violations = validateValue(schema, json);
  return { state: violations.some(v => v.code === 'UNSUPPORTED_SCHEMA') ? 'UNKNOWN' :
    violations.length ? 'FAIL' : 'PASS', violations };
}
