export const shareUrl = async (input: {
  title: string;
  text: string;
  url: string;
}): Promise<"shared" | "copied"> => {
  if (typeof navigator.share === "function") {
    await navigator.share(input);
    return "shared";
  }

  if (navigator.clipboard !== undefined) {
    await navigator.clipboard.writeText(input.url);
  } else {
    const field = document.createElement("textarea");
    field.value = input.url;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }
  return "copied";
};
