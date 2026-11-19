import { useState, type ComponentPropsWithoutRef } from "react";
import { getDefaultAvatar } from "@/utils/defaultAvatar";

type ProfileAvatarImageProps = ComponentPropsWithoutRef<"img"> & {
  fallbackSrc?: string;
};

/** Shows a stable fallback when a legacy or migrated avatar URL no longer exists. */
export function ProfileAvatarImage({
  src,
  fallbackSrc = getDefaultAvatar(),
  onError,
  ...props
}: ProfileAvatarImageProps) {
  const [failed, setFailed] = useState(false);

  return (
    <img
      {...props}
      src={failed ? fallbackSrc : src}
      onError={(event) => {
        onError?.(event);
        if (!event.defaultPrevented) setFailed(true);
      }}
    />
  );
}
