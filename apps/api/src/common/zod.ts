import {
  applyDecorators,
  type ArgumentMetadata,
  BadRequestException,
  type PipeTransform,
  UsePipes,
} from '@nestjs/common';
import { ApiBody, ApiQuery } from '@nestjs/swagger';
import { z, type ZodType } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(
    private readonly schema: ZodType,
    private readonly only?: ArgumentMetadata['type'],
  ) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    if (this.only && metadata.type !== this.only) return value;
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Request validation failed',
        details: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    return result.data;
  }
}

function toJsonSchema(schema: ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as Record<
    string,
    unknown
  >;
  delete json['$schema'];
  return json;
}

/** Validates the request body with a zod schema and documents it in Swagger from the same schema. */
export function ZodBody(schema: ZodType) {
  return applyDecorators(
    ApiBody({ schema: toJsonSchema(schema) as never }),
    UsePipes(new ZodValidationPipe(schema, 'body')),
  );
}

/** Documents each top-level property of an object schema as a query parameter. */
export function ZodQueryDocs(schema: z.ZodObject) {
  const json = toJsonSchema(schema);
  const props = (json['properties'] ?? {}) as Record<string, Record<string, unknown>>;
  const required = (json['required'] ?? []) as string[];
  return applyDecorators(
    ...Object.entries(props).map(([name, prop]) =>
      ApiQuery({ name, required: required.includes(name), schema: prop as never }),
    ),
  );
}
