export interface FeatureNames {
  kebab: string;
  camel: string;
  pascal: string;
  singularKebab: string;
  singularCamel: string;
  singularPascal: string;
}

export function validateModuleName(value: string): string {
  const name = value.trim();
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name))
    throw new Error('Module name must be kebab-case and begin with a letter');
  if (name.length > 64) throw new Error('Module name must not exceed 64 characters');
  return name;
}

const pascal = (value: string) =>
  value.split('-').map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`).join('');
const singularize = (value: string) => value.endsWith('ies') ? `${value.slice(0, -3)}y` : value.endsWith('s') && !value.endsWith('ss') ? value.slice(0, -1) : value;

export function featureNames(value: string): FeatureNames {
  const kebab = validateModuleName(value);
  const singularKebab = singularize(kebab);
  const pascalName = pascal(kebab);
  const singularPascal = pascal(singularKebab);
  return {
    kebab,
    camel: `${pascalName[0]?.toLowerCase() ?? ''}${pascalName.slice(1)}`,
    pascal: pascalName,
    singularKebab,
    singularCamel: `${singularPascal[0]?.toLowerCase() ?? ''}${singularPascal.slice(1)}`,
    singularPascal,
  };
}
