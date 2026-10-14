import { initials } from "@/lib/format/name";
import { cn } from "@/lib/utils";

interface MemberAvatarProps {
  name: string;
  /** The member's categorical slot — see `buildMemberColors`. */
  color: string;
  size?: "sm" | "md";
  /**
   * Announce the name to a screen reader.
   *
   * Off by default: nearly every avatar here sits beside the name it stands
   * for, and reading it twice is noise. Turn it on where the mark is the only
   * thing identifying the person — the header, for instance.
   */
  labelled?: boolean;
  className?: string;
}

/**
 * A person, as a mark.
 *
 * The colour is a tinted ground and a ring rather than a solid fill: the
 * categorical palette is tuned for marks on a card surface, not as a backdrop
 * for white text, and initials sitting in foreground ink stay legible in both
 * themes at every slot.
 */
export function MemberAvatar({
  name,
  color,
  size = "sm",
  labelled = false,
  className,
}: MemberAvatarProps) {
  return (
    <span
      title={name}
      aria-hidden={labelled ? undefined : true}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border-2 font-semibold",
        size === "sm" ? "size-6 text-xs" : "size-9 text-sm",
        className,
      )}
      style={{
        borderColor: color,
        backgroundColor: `color-mix(in oklab, ${color} 20%, transparent)`,
      }}
    >
      <span aria-hidden="true">{initials(name)}</span>
      {labelled ? <span className="sr-only">{name}</span> : null}
    </span>
  );
}
