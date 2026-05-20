import React from "react";

type AnyProps = Record<string, unknown>;

function NextImageMock(props: AnyProps) {
  const {
    src,
    alt,
    width,
    height,
    fill,
    sizes,
    priority,
    loader,
    quality,
    placeholder,
    blurDataURL,
    onLoadingComplete,
    ...rest
  } = props as {
    src: string | { src?: string };
    alt: string;
    width?: number | string;
    height?: number | string;
    fill?: boolean;
    sizes?: string;
    priority?: boolean;
    loader?: unknown;
    quality?: number;
    placeholder?: string;
    blurDataURL?: string;
    onLoadingComplete?: unknown;
  } & AnyProps;

  void sizes;
  void priority;
  void loader;
  void quality;
  void placeholder;
  void blurDataURL;
  void onLoadingComplete;

  const finalSrc =
    typeof src === "string" ? src : (src as { src?: string })?.src ?? "";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={finalSrc}
      alt={alt}
      width={fill ? undefined : (width as number | undefined)}
      height={fill ? undefined : (height as number | undefined)}
      {...rest}
    />
  );
}

export default NextImageMock;
