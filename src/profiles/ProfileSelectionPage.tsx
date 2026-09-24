import { useEffect, useState } from "react"
import type { Profile } from "./profileStore"
import { loadProfileData } from "./profileDataStore"
import { umaVersions } from "../data/umaData"
import UmaAvatarImage from "../components/UmaAvatarImage"

type ProfileSelectionPageProps = {
  profiles: Profile[]
  onSelectProfile: (profile: Profile) => void
  onCreateProfile: () => void
  onRenameProfile: (
    profile: Profile,
    newName: string
  ) => void
  onDeleteProfile: (
    profile: Profile
    ) => void
  onExportProfile: (
    profile: Profile
    ) => void
  onImportProfile: () => void
}

function ProfileSelectionPage({
  profiles,
  onSelectProfile,
  onCreateProfile,
  onRenameProfile,
  onDeleteProfile,
  onExportProfile,
  onImportProfile,
}: ProfileSelectionPageProps) {

const [favoriteUmaIds, setFavoriteUmaIds] = useState<Record<string, string>>({})

useEffect(() => {
  const loadFavoriteUmaIds = async () => {
    const entries = await Promise.all(
      profiles.map(async (profile) => {
        const data = await loadProfileData(profile.id)

        return [profile.id, data?.favoriteUmaId ?? ""] as const
      })
    )

    setFavoriteUmaIds(Object.fromEntries(entries))
  }

  void loadFavoriteUmaIds()
}, [profiles])

const getFavoriteUma = (profileId: string) => {
  const favoriteUmaId = favoriteUmaIds[profileId]

  if (!favoriteUmaId) {
    return null
  }

  return umaVersions.find(
  (version) => version.id === favoriteUmaId
) ?? null
}

const [
  isExportOpen,
  setIsExportOpen,
] = useState(false)

const [
  profileToExport,
  setProfileToExport,
] = useState<Profile | null>(null)

const [
  profileToDelete,
  setProfileToDelete,
] = useState<Profile | null>(null)

const [
  profileToRename,
  setProfileToRename,
] = useState<Profile | null>(null)

const [
  renameName,
  setRenameName,
] = useState("")

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030811] px-6 py-10 text-gray-100">

      {/* BACKGROUND */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[650px] w-[650px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/[0.07] blur-[140px]" />

      <div className="pointer-events-none absolute left-[25%] top-[30%] h-72 w-72 rounded-full bg-sky-500/[0.05] blur-[120px]" />

      <div className="relative z-10 w-full max-w-5xl">

        {/* HEADER */}
        <div className="relative">
        <div className="text-center">
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
            Select Profile
            </h1>

            <p className="mt-2 text-sm text-blue-100/35">
            Choose a trainer profile to continue.
            </p>
        </div>

        {/* PROFILE TOOLS */}
        <div className="absolute right-0 top-0 flex items-center gap-2">
            <button
                type="button"
                disabled={profiles.length === 0}
                onClick={() => {
                    setProfileToExport(null)
                    setIsExportOpen(true)
                }}
                className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs font-bold text-blue-100/50 transition hover:border-violet-300/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                Export Profile
                </button>

            <button
              type="button"
              onClick={onImportProfile}
              className="rounded-lg border border-violet-300/20 bg-violet-400/[0.06] px-3 py-2 text-xs font-black text-violet-200/80 transition hover:border-violet-300/40 hover:bg-violet-400/[0.10] hover:text-violet-100"
            >
              Import Profile
            </button>
        </div>
        </div>

        {/* PROFILES */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <div
                key={profile.id}
                className="group relative overflow-hidden rounded-2xl border border-violet-300/15 bg-[#07111f]/95 p-5 text-left shadow-xl transition hover:-translate-y-0.5 hover:border-violet-300/35 hover:bg-[#091725]"
                >
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/[0.08] blur-3xl" />

              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-violet-300/20 bg-violet-400/[0.07]">
                  {getFavoriteUma(profile.id)?.avatar ? (
                    <UmaAvatarImage
                      avatar={getFavoriteUma(profile.id)!.avatar!}
                      alt={getFavoriteUma(profile.id)!.displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-black text-violet-200">
                      {profile.name
                        .trim()
                        .charAt(0)
                        .toUpperCase() || "?"}
                    </span>
                  )}
                </div>

                <div className="mt-5 text-lg font-black text-white">
                  {profile.name}
                </div>

                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-100/25">
                  Trainer Profile
                </div>
                <div className="mt-5 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() =>
                        onSelectProfile(profile)
                        }
                        className="mr-auto text-xs font-bold text-violet-200/55 transition hover:text-violet-200"
                    >
                        Continue →
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setProfileToRename(profile)
                            setRenameName(profile.name)
                        }}
                        className="rounded-md border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 text-[10px] font-bold text-blue-100/35 transition hover:border-violet-300/25 hover:text-violet-200"
                        >
                        Rename
                        </button>

                    <button
                        type="button"
                        onClick={() =>
                        setProfileToDelete(profile)
                        }
                        className="rounded-md border border-red-300/[0.10] bg-red-400/[0.025] px-2.5 py-1.5 text-[10px] font-bold text-red-200/40 transition hover:border-red-300/30 hover:bg-red-400/[0.06] hover:text-red-200"
                    >
                        Delete
                    </button>
                    </div>
              </div>
            </div>
          ))}

          {/* CREATE PROFILE */}
          <button
            type="button"
            onClick={onCreateProfile}
            className="group flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.10] bg-white/[0.015] p-5 text-center transition hover:border-sky-300/30 hover:bg-sky-400/[0.025]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-sky-300/20 bg-sky-400/[0.05] text-2xl font-light text-sky-200/70 transition group-hover:border-sky-300/40 group-hover:text-sky-200">
              +
            </div>

            <div className="mt-3 text-sm font-black text-white/70">
              Create Profile
            </div>

            <div className="mt-1 text-[10px] text-blue-100/25">
              Add another trainer
            </div>
          </button>
        </div>

        {profiles.length === 0 && (
          <div className="mt-6 text-center text-xs text-blue-100/25">
            No profiles yet. Create your first trainer profile.
          </div>
        )}

      </div>
      {profileToDelete && (
  <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-red-300/15 bg-[#07111f] shadow-2xl">

      <div className="border-b border-white/[0.07] px-6 py-5">
        <div className="text-[10px] font-black uppercase tracking-[0.20em] text-red-300/50">
          Delete Profile
        </div>

        <div className="mt-1 text-xl font-black text-white">
          Delete {profileToDelete.name}?
        </div>

        <div className="mt-2 text-sm leading-relaxed text-blue-100/35">
          This will permanently remove the profile and its tracker data.
        </div>
      </div>

      <div className="flex justify-end gap-2 px-6 py-4">
        <button
          type="button"
          onClick={() =>
            setProfileToDelete(null)
          }
          className="rounded-lg border border-white/[0.08] px-4 py-2 text-xs font-bold text-blue-100/50 transition hover:border-white/[0.15] hover:text-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            const profile =
              profileToDelete

            setProfileToDelete(null)
            onDeleteProfile(profile)
          }}
          className="rounded-lg border border-red-300/25 bg-red-400/[0.08] px-4 py-2 text-xs font-black text-red-200 transition hover:border-red-300/45 hover:bg-red-400/[0.14]"
        >
          Delete Profile
        </button>
        
      </div>
          

    </div>
  </div>
)}
{profileToRename && (
  <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-violet-300/20 bg-[#07111f] shadow-2xl">

      {/* HEADER */}
      <div className="border-b border-white/[0.07] px-6 py-5">
        <div className="text-[10px] font-black uppercase tracking-[0.20em] text-violet-300/50">
          Trainer Profile
        </div>

        <div className="mt-1 text-xl font-black text-white">
          Rename Profile
        </div>

        <div className="mt-1 text-sm text-blue-100/35">
          Change the name of this trainer profile.
        </div>
      </div>

      {/* INPUT */}
      <div className="px-6 py-5">
        <label className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-100/35">
          Profile Name
        </label>

        <input
          autoFocus
          type="text"
          value={renameName}
          maxLength={32}
          onChange={(event) =>
            setRenameName(
              event.target.value
            )
          }
          onFocus={(event) =>
            event.currentTarget.select()
          }
          onKeyDown={(event) => {
            const trimmedName =
              renameName.trim()

            if (
              event.key === "Enter" &&
              trimmedName !== "" &&
              trimmedName !==
                profileToRename.name
            ) {
              onRenameProfile(
                profileToRename,
                trimmedName
              )

              setProfileToRename(null)
              setRenameName("")
            }

            if (event.key === "Escape") {
              setProfileToRename(null)
              setRenameName("")
            }
          }}
          placeholder="Trainer name..."
          className="mt-2 h-11 w-full rounded-lg border border-violet-300/15 bg-[#030811] px-3 text-sm font-semibold text-white outline-none placeholder:text-blue-100/20 focus:border-violet-300/40"
        />

        <div className="mt-2 flex items-center justify-between">
          <div className="text-[10px] text-blue-100/45">
                Current:{" "}
                <span className="font-bold text-violet-200/70">
                    {profileToRename.name}
                </span>
                </div>

          <div className="text-[10px] text-blue-100/20">
            {renameName.length} / 32
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex justify-end gap-2 border-t border-white/[0.07] px-6 py-4">
        <button
          type="button"
          onClick={() => {
            setProfileToRename(null)
            setRenameName("")
          }}
          className="rounded-lg border border-white/[0.08] px-4 py-2 text-xs font-bold text-blue-100/50 transition hover:border-white/[0.15] hover:text-white"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={
            renameName.trim() === "" ||
            renameName.trim() ===
              profileToRename.name
          }
          onClick={() => {
            const trimmedName =
              renameName.trim()

            if (
              trimmedName === "" ||
              trimmedName ===
                profileToRename.name
            ) {
              return
            }

            onRenameProfile(
              profileToRename,
              trimmedName
            )

            setProfileToRename(null)
            setRenameName("")
          }}
          className="rounded-lg border border-violet-300/25 bg-violet-400/[0.10] px-4 py-2 text-xs font-black text-violet-200 transition hover:border-violet-300/45 hover:bg-violet-400/[0.16] disabled:cursor-not-allowed disabled:opacity-30"
        >
          Save Name
        </button>
      </div>

    </div>
  </div>
)}
{isExportOpen && (
  <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
    <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-violet-300/20 bg-[#07111f] shadow-2xl">

      {/* HEADER */}
      <div className="border-b border-white/[0.07] px-6 py-5">
        <div className="text-[10px] font-black uppercase tracking-[0.20em] text-violet-300/50">
          Profile Tools
        </div>

        <div className="mt-1 text-xl font-black text-white">
          Export Profile
        </div>

        <div className="mt-1 text-sm text-blue-100/35">
          Choose the trainer profile you want to export.
        </div>
      </div>

      {/* PROFILE LIST */}
      <div className="max-h-[360px] space-y-2 overflow-y-auto px-6 py-5">
        {profiles.map((profile) => {
          const selected =
            profileToExport?.id ===
            profile.id

          return (
            <button
              key={profile.id}
              type="button"
              onClick={() =>
                setProfileToExport(
                  profile
                )
              }
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                selected
                  ? "border-violet-300/40 bg-violet-400/[0.10]"
                  : "border-white/[0.07] bg-black/10 hover:border-violet-300/20 hover:bg-violet-400/[0.04]"
              }`}
            >
              <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border text-sm font-black ${
                selected
                  ? "border-violet-300/35 bg-violet-400/[0.12] text-violet-100"
                  : "border-white/[0.08] bg-white/[0.02] text-blue-100/50"
              }`}
            >
              {getFavoriteUma(profile.id)?.avatar ? (
                <UmaAvatarImage
                  avatar={getFavoriteUma(profile.id)!.avatar!}
                  alt={getFavoriteUma(profile.id)!.displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <>
                  {profile.name
                    .trim()
                    .charAt(0)
                    .toUpperCase() || "?"}
                </>
              )}
            </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-black text-white">
                  {profile.name}
                </div>

                <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-blue-100/25">
                  Trainer Profile
                </div>
              </div>

              {selected && (
                <div className="ml-auto text-sm font-black text-violet-200">
                  ✓
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* ACTIONS */}
      <div className="flex justify-end gap-2 border-t border-white/[0.07] px-6 py-4">
        <button
          type="button"
          onClick={() => {
            setIsExportOpen(false)
            setProfileToExport(null)
          }}
          className="rounded-lg border border-white/[0.08] px-4 py-2 text-xs font-bold text-blue-100/50 transition hover:border-white/[0.15] hover:text-white"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={!profileToExport}
          onClick={() => {
            if (!profileToExport) {
              return
            }

            const profile =
              profileToExport

            setIsExportOpen(false)
            setProfileToExport(null)

            onExportProfile(profile)
          }}
          className="rounded-lg border border-violet-300/25 bg-violet-400/[0.10] px-4 py-2 text-xs font-black text-violet-200 transition hover:border-violet-300/45 hover:bg-violet-400/[0.16] disabled:cursor-not-allowed disabled:opacity-30"
        >
          Export Profile
        </button>
      </div>

    </div>
  </div>
)}
    </div>
  )
}


export default ProfileSelectionPage