import React from "react";

type AnyProps = Record<string, unknown>;

function NextLinkMock(props: AnyProps) {
  const { href, children, prefetch, replace, scroll, shallow, locale, ...rest } =
    props as {
      href: string | { pathname?: string; href?: string };
      children: React.ReactNode;
      prefetch?: boolean;
      replace?: boolean;
      scroll?: boolean;
      shallow?: boolean;
      locale?: string | false;
    } & AnyProps;

  void prefetch;
  void replace;
  void scroll;
  void shallow;
  void locale;

  const finalHref =
    typeof href === "string"
      ? href
      : (href as { pathname?: string; href?: string })?.pathname ??
        (href as { href?: string })?.href ??
        "#";

  return (
    <a href={finalHref} {...rest}>
      {children}
    </a>
  );
}

export default NextLinkMock;
