export function sanitizeHtml(input: string): string {
  const documentFragment = new DOMParser().parseFromString(input, 'text/html');
  documentFragment.querySelectorAll('script,iframe,object,embed,style').forEach((node) => node.remove());
  documentFragment.querySelectorAll('*').forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      if (attribute.name.startsWith('on') || attribute.value.trim().toLowerCase().startsWith('javascript:')) {
        element.removeAttribute(attribute.name);
      }
    });
  });
  return documentFragment.body.innerHTML;
}
