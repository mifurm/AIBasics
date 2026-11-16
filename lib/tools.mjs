export const multiplyTool = {
  type: 'function',
  function: {
    name: 'multiply', description: 'Multiply a quantity by a unit price in fictional credits.',
    strict: true,
    parameters: {
      type: 'object',
      properties: { quantity: { type: 'integer' }, unitPrice: { type: 'integer' } },
      required: ['quantity', 'unitPrice'], additionalProperties: false,
    },
  },
};

export function executeMultiply(name, argumentsText) {
  if (name !== 'multiply') throw new Error(`Tool "${name}" is not allowed.`);
  const args = JSON.parse(argumentsText);
  if (!args || Array.isArray(args) || Object.keys(args).sort().join(',') !== 'quantity,unitPrice') {
    throw new Error('Tool arguments must contain only quantity and unitPrice.');
  }

  for (const value of Object.values(args)) {
    if (!Number.isSafeInteger(value) || value < 0 || value > 10000) {
      throw new Error('Tool arguments must be safe integers between 0 and 10000.');
    }
  }
  return { arguments: args, total: args.quantity * args.unitPrice };
}

export const catalogTool = {
  type: 'function', function: {
    name: 'lookup_price', description: 'Look up a classroom item in a read-only fictional catalog.',
    strict: true, parameters: {
      type: 'object', properties: { item: { type: 'string', enum: ['robot kit'] } },
      required: ['item'], additionalProperties: false,
    },
  },
};

export function executeCatalog(name, argumentsText) {
  if (name !== 'lookup_price') throw new Error(`Tool "${name}" is not allowed.`);
  const args = JSON.parse(argumentsText);
  if (!args || Array.isArray(args) || Object.keys(args).join(',') !== 'item' || args.item !== 'robot kit') {
    throw new Error('Only an exact robot kit catalog lookup is allowed.');
  }
  return { arguments: args, item: args.item, unitPrice: 23, currency: 'fictional credits' };
}
