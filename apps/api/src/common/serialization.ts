/** Serialise bigint as decimal strings in every JSON response. */
export function installBigIntJson(): void {
  const proto = BigInt.prototype as unknown as { toJSON?: () => string };
  if (!proto.toJSON) {
    Object.defineProperty(BigInt.prototype, 'toJSON', {
      value: function toJSON(this: bigint) {
        return this.toString();
      },
      configurable: true,
    });
  }
}
