"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Cropper, { type Area } from "react-easy-crop";
import { CameraIcon, ZoomInIcon, ZoomOutIcon } from "@radix-ui/react-icons";
import { DISPLAY_NAME_MAX_LENGTH } from "@tim/user-display";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { getInitials } from "@/components/ui/user-avatar";
import { useSelf } from "@/components/auth/self-provider";
import { useActiveCircleMembers } from "@/components/dashboard/active-circle-members-store";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import { updateProfile } from "@/actions/profile";
import { cropToAvatar } from "@/lib/crop-image";
import { cn } from "@/lib/utils";

// Decoding a huge photo into a canvas can stall low-end phones; anything a camera produces fits.
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

type Props = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function EditProfileModal(props: Props) {
  const self = useSelf();
  const router = useRouter();
  const updatedProfile = useSocketEmit(SocketEvent.UserUpdatedProfile);
  const { getCircleIdsFromTopicMap } = useActiveCircleMembers();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(self.displayName);
  // Cropped, not-yet-saved avatar (data URL); undefined keeps the current one.
  const [avatar, setAvatar] = useState<string>();
  const [cropSource, setCropSource] = useState<string>();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropArea, setCropArea] = useState<Area>();
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);

  // The dialog never unmounts (parent just toggles `open`), so reset the draft each time it opens.
  useEffect(() => {
    if (!props.open) return;
    setDisplayName(self.displayName);
    setAvatar(undefined);
    setCropSource(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open]);

  useEffect(() => {
    if (!cropSource) return;
    return () => URL.revokeObjectURL(cropSource);
  }, [cropSource]);

  const pickFile = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", description: "That isn't an image." });
      return;
    }

    if (file.size > MAX_SOURCE_BYTES) {
      toast({
        variant: "destructive",
        description: "That image is too large (20 MB max).",
      });
      return;
    }

    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropSource(URL.createObjectURL(file));
  };

  const applyCrop = async () => {
    if (!cropSource || !cropArea) return;
    setAvatar(await cropToAvatar(cropSource, cropArea));
    setCropSource(undefined);
  };

  const trimmedName = displayName.trim();
  const canSave =
    !saving &&
    trimmedName.length > 0 &&
    (trimmedName !== self.displayName || !!avatar);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);

    const resp = await updateProfile({ displayName: trimmedName, avatar });

    setSaving(false);

    if (!resp) {
      toast({
        variant: "destructive",
        description: "Couldn't save your profile. Try again.",
      });
      return;
    }

    updatedProfile.emit({ circleIds: getCircleIdsFromTopicMap() });
    router.refresh();
    props.onOpenChange?.(false);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cropSource ? "Crop photo" : "Edit profile"}</DialogTitle>
          <DialogDescription>
            {cropSource
              ? "Drag to reposition, scroll or use the slider to zoom."
              : "How you appear to everyone in your circles."}
          </DialogDescription>
        </DialogHeader>

        {cropSource ? (
          <div className="flex flex-col gap-4">
            <div className="relative h-72 w-full overflow-hidden rounded-md bg-muted">
              <Cropper
                image={cropSource}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCropArea(pixels)}
              />
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <ZoomOutIcon className="shrink-0" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                aria-label="Zoom"
                className="w-full accent-primary"
              />
              <ZoomInIcon className="shrink-0" />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setCropSource(undefined)}
              >
                Back
              </Button>
              <Button type="button" onClick={applyCrop} disabled={!cropArea}>
                Apply
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                pickFile(e.target.files?.[0]);
                // Lets re-picking the same file fire onChange again.
                e.target.value = "";
              }}
            />
            <div className="flex items-center gap-4">
              <button
                type="button"
                aria-label="Change photo"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  pickFile(e.dataTransfer.files?.[0]);
                }}
                className={cn(
                  "group relative shrink-0 rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isDragging && "ring-2 ring-primary ring-offset-2",
                )}
              >
                <Avatar className="size-20 shadow-md">
                  <AvatarImage
                    src={avatar ?? self.imageUrl ?? undefined}
                    className="rounded-full object-cover"
                  />
                  <AvatarFallback className="text-xl">
                    {getInitials(trimmedName || self.name || undefined)}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100",
                    isDragging && "opacity-100",
                  )}
                >
                  <CameraIcon className="size-5" />
                </span>
              </button>
              <div className="flex flex-col items-start gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  Upload photo
                </Button>
                {avatar ? (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-muted-foreground"
                    onClick={() => setAvatar(undefined)}
                  >
                    Undo
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Or drop an image on your avatar
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                maxLength={DISPLAY_NAME_MAX_LENGTH}
                autoComplete="nickname"
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Shown on your messages and used for @mentions.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button variant="ghost" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={!canSave}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
