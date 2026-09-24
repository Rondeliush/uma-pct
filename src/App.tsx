import {
  useEffect,
  useRef,
  useState,
} from "react"

import SettingsPage from "./Settings/SettingsPage"
import AboutPage from "./About/AboutPage"
import ChangelogPage from "./Changelog/ChangelogPage"
import UmaDatabaseProvider from "./context/UmaDatabaseProvider"
import { useUmaDatabase } from "./context/UmaDatabaseContext"

import UmaDatabase from "./Umas/UmaDatabase"
import HomePage from "./Home/HomePage"
import ChampionsMeetingPage from "./CMs/ChampionsMeetingPage"
import LeagueOfHeroesPage from "./LoH/LeagueOfHeroesPage"
import StatisticsPage from "./Statistics/StatisticsPage"
import StatisticsShowcase from "./Statistics/StatisticsShowcase"

import Header from "./components/Header"
import UpdateReviewModal from "./components/UpdateReviewModal"
import SplashScreen from "./components/SplashScreen"
import UmaAvatarImage from "./components/UmaAvatarImage"

import ProfileSelectionPage from "./profiles/ProfileSelectionPage"
import CreateProfileModal from "./profiles/CreateProfileModal"
import WelcomePage from "./profiles/WelcomePage"
import ProfileGuide from "./onboarding/ProfileGuide"
import CMLineupGuide from "./onboarding/CMLineupGuide"

import type {
  CM,
  LoH,
} from "./types/types"

import type { Profile } from "./profiles/profileStore"

import {
  createProfile,
  loadProfiles,
  renameProfile,
  saveProfiles,
  deleteProfile,
} from "./profiles/profileStore"

import {
  clearActiveProfileId,
  loadActiveProfileId,
  saveActiveProfileId,
} from "./profiles/activeProfileStore"

import {
  createEmptyProfileData,
  loadProfileData,
  saveProfileData,
  updateProfileData,
  deleteProfileData,
  type ProfileData,
} from "./profiles/profileDataStore"

import { umaVersions } from "./data/umaData"

import AutoRunTimerPage from "./AutoRun/AutoRunTimerPage"

import {
  AutoRunTimerProvider,
} from "./AutoRun/AutoRunTimerProvider"

type ImportedProfileFile = {
  format: "uma-tracker-profile"
  version: 1

  profile: {
    sourceProfileId: string
    name: string
  }

  data: ProfileData
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null
  )
}

function isProfileData(
  value: unknown
): value is ProfileData {
  if (!isRecord(value)) {
    return false
  }

  const customUmaDatabase =
    value.customUmaDatabase

  if (!isRecord(customUmaDatabase)) {
    return false
  }

  return (
    Array.isArray(value.cms) &&
    Array.isArray(value.lohs) &&
    Array.isArray(
      customUmaDatabase.customCharacters
    ) &&
    Array.isArray(
      customUmaDatabase.customVersions
    ) &&
    Array.isArray(
      customUmaDatabase.archivedVersionIds
    ) &&
    typeof value.favoriteUmaId ===
      "string" &&
    (
      value.cmViewMode === "detailed" ||
      value.cmViewMode === "compact"
    ) &&
    Array.isArray(
      value.seenOfficialVersionIds
    ) &&
    value.seenOfficialVersionIds.every(
      (id) => typeof id === "string"
    )
  )
}

function isImportedProfileFile(
  value: unknown
): value is ImportedProfileFile {
  if (!isRecord(value)) {
    return false
  }

  if (
    value.format !==
      "uma-tracker-profile" ||
    value.version !== 1 ||
    !isRecord(value.profile)
  ) {
    return false
  }

  return (
    typeof value.profile
      .sourceProfileId === "string" &&
    value.profile.sourceProfileId !== "" &&
    typeof value.profile.name ===
      "string" &&
    value.profile.name.trim() !== "" &&
    isProfileData(value.data)
  )
}

type AppContentProps = {
  profileId: string
  profileName: string
  onProfilesClick: () => void
}

function AppContent({
  profileId,
  profileName,
  onProfilesClick,
}: AppContentProps) {
  const { newOfficialVersions } =
    useUmaDatabase()
  
  const [cms, setCms] =
    useState<CM[]>([])

  const [lohs, setLohs] =
    useState<LoH[]>([])

  const [
    isStoreReady,
    setIsStoreReady,
  ] = useState(false)

  const [
    showProfileGuide,
    setShowProfileGuide,
  ] = useState(false)

  const [
  showCmLineupGuide,
  setShowCmLineupGuide,
] = useState(false)

const [
  cmLineupGuideCompleted,
  setCmLineupGuideCompleted,
] = useState<boolean | null>(null)

  const skipNextCmsSave =
    useRef(false)

  const skipNextLohsSave =
    useRef(false)

  const [
    activePage,
    setActivePage,
  ] = useState<
    | "home"
    | "cms"
    | "loh"
    | "statistics"
    | "autoRunTimer"
    | "umaDatabase"
    | "settings"
    | "about"
    | "changelog"
  >("home")

  const [
    isUpdateReviewOpen,
    setIsUpdateReviewOpen,
  ] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      setIsStoreReady(false)

      const profileData =
        await loadProfileData(profileId)

      if (
        cancelled ||
        !profileData
      ) {
        return
      }

      skipNextCmsSave.current = true
      skipNextLohsSave.current = true

      setCms(profileData.cms)
      setLohs(profileData.lohs)

      setShowProfileGuide(
        profileData.onboardingCompleted === false
      )
      setCmLineupGuideCompleted(
      profileData.cmLineupGuideCompleted ??
        null
    )
      setIsStoreReady(true)
    }

    void loadData()


    return () => {
      cancelled = true
    }
  }, [profileId])

  useEffect(() => {
  if (!isStoreReady) {
    return
  }

  if (showProfileGuide) {
    return
  }

  if (
    cmLineupGuideCompleted !== false
  ) {
    return
  }

  if (cms.length === 0) {
    return
  }

  setActivePage("cms")
  setShowCmLineupGuide(true)
}, [
  cms.length,
  isStoreReady,
  showProfileGuide,
  cmLineupGuideCompleted,
])

  useEffect(() => {
    if (!isStoreReady) {
      return
    }

    if (skipNextCmsSave.current) {
      skipNextCmsSave.current = false
      return
    }

    void updateProfileData(
      profileId,
      (currentData) => ({
        ...currentData,
        cms: [...cms],
      })
    )
  }, [
    cms,
    isStoreReady,
    profileId,
  ])

  useEffect(() => {
    if (!isStoreReady) {
      return
    }

    if (skipNextLohsSave.current) {
      skipNextLohsSave.current = false
      return
    }

    void updateProfileData(
      profileId,
      (currentData) => ({
        ...currentData,
        lohs: [...lohs],
      })
    )
  }, [
    lohs,
    isStoreReady,
    profileId,
  ])

  const handleCompleteProfileGuide = () => {
  setShowProfileGuide(false)

    void updateProfileData(
      profileId,
      (currentData) => ({
        ...currentData,
        onboardingCompleted: true,
      })
    )
  }

  const handleCompleteCmLineupGuide = () => {
  setShowCmLineupGuide(false)
  setCmLineupGuideCompleted(true)

  void updateProfileData(
    profileId,
    (currentData) => ({
      ...currentData,
      cmLineupGuideCompleted: true,
    })
  )
}

  const newOfficialUmaNames =
    newOfficialVersions.map(
      (version) =>
        version.displayName
    )
        const pageBackground =
          activePage === "umaDatabase"
            ? `${import.meta.env.BASE_URL}uma-database-background.jpg`
            : activePage === "settings"
              ? `${import.meta.env.BASE_URL}settings-background.jpg`
              : `${import.meta.env.BASE_URL}background.jpg`

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* HEADER */}
      <Header
        activePage={activePage}
        onPageChange={setActivePage}
        newOfficialUmaNames={
          newOfficialUmaNames
        }
        onViewUpdate={() => {
          setIsUpdateReviewOpen(true)
        }}
        activeProfileName={profileName}
        onProfilesClick={onProfilesClick}
      />
      
      {showProfileGuide && (
        <ProfileGuide
          onNavigate={(page) => {
            setActivePage(page)
          }}
          onComplete={
            handleCompleteProfileGuide
          }
        />
      )}

      {showCmLineupGuide &&
      !showProfileGuide && (
        <CMLineupGuide
          cmNumber={
            cms[cms.length - 1]?.number
          }
          onComplete={
            handleCompleteCmLineupGuide
          }
        />
      )}


      {/* FULL WIDTH PAGE BACKGROUND */}
      <div
        className="relative min-h-screen bg-cover bg-center bg-fixed"
        style={{
          backgroundImage: `url("${pageBackground}")`,
        }}
      >
        {isUpdateReviewOpen && (
          <UpdateReviewModal
            versions={
              newOfficialVersions
            }
            setCms={setCms}
            onClose={() =>
              setIsUpdateReviewOpen(
                false
              )
            }
          />
        )}

        {/* DARK OVERLAY */}
        <div className="absolute inset-0 bg-gray-950/50" />

        {/* STATISTICS SHOWCASE */}
        {activePage ===
          "statistics" && (
          <div className="relative z-10 mx-auto mb-8 w-full max-w-[1500px] px-6 pt-6">
            <StatisticsShowcase
              cms={cms}
            />
          </div>
        )}

        {/* STATISTICS DASHBOARD */}
        {activePage ===
          "statistics" && (
          <div className="relative z-10 mx-auto w-full max-w-[1500px] px-6 pb-10">
            <StatisticsPage
              cms={cms}
              setCms={setCms}
            />
          </div>
        )}

        {/* LEAGUE OF HEROES */}
        {activePage === "loh" && (
          <div className="relative z-10 mx-auto w-full max-w-[1500px] px-6 py-6">
            <LeagueOfHeroesPage />
          </div>
        )}

        {/* HOME */}
        {activePage === "home" && (
          <div className="relative z-10 mx-auto w-full max-w-[1500px] px-6 py-6">
            <HomePage
              cms={cms}
              profileId={profileId}
              onOpenChangelog={() =>
                setActivePage("changelog")
              }
            />
          </div>
        )}

        {/* CHAMPIONS MEETING */}
        {activePage === "cms" && (
          <div className="relative min-h-screen w-full overflow-hidden">

            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">

              <div className="cm-side-aura absolute -bottom-10 -left-10 -top-10 w-[calc(24vw+2.5rem)] bg-gradient-to-r from-blue-950/35 via-blue-900/12 to-transparent blur-xl" />

              <div className="cm-edge-glow absolute -bottom-10 -left-8 -top-10 w-[calc(7vw+2rem)] bg-gradient-to-r from-blue-700/28 via-blue-800/12 to-transparent blur-lg" />

              <div className="cm-side-aura cm-side-aura-right absolute -bottom-10 -right-10 -top-10 w-[calc(24vw+2.5rem)] bg-gradient-to-l from-slate-900/35 via-blue-950/12 to-transparent blur-xl" />

              <div className="cm-edge-glow cm-edge-glow-right absolute -bottom-10 -right-8 -top-10 w-[calc(7vw+2rem)] bg-gradient-to-l from-blue-700/28 via-blue-800/12 to-transparent blur-lg" />

              <div className="absolute -bottom-10 -left-10 -right-10 h-[calc(20vh+2.5rem)] bg-gradient-to-t from-blue-950/30 via-blue-900/10 to-transparent blur-xl" />

              <div className="cm-bottom-glow absolute -bottom-8 left-[8%] right-[8%] h-[calc(7vh+2rem)] bg-gradient-to-t from-blue-800/18 to-transparent blur-2xl" />

            </div>

            <div className="relative z-10 mx-auto w-full max-w-[1500px] px-6 py-6">
              <ChampionsMeetingPage
                cms={cms}
                setCms={setCms}
                profileId={profileId}
              />
            </div>

          </div>
        )}

          {/* AUTORUN TIMER */}
          {activePage === "autoRunTimer" && (
            <div className="relative z-10 mx-auto w-full max-w-[1500px] px-6 py-6">
              <AutoRunTimerPage
          onOpenSettings={() =>
            setActivePage("settings")
          }
/>
            </div>
          )}

        {/* UMA DATABASE */}
        {activePage === "umaDatabase" && (
          <div className="relative z-10 mx-auto min-h-screen max-w-[1500px] border-x-2 border-gray-600 bg-gray-900/90">
            <main className="px-6 py-6">
              <UmaDatabase
                cms={cms}
                hasUpdateNotification={
                  newOfficialVersions.length > 0
                }
              />
            </main>
          </div>
        )}

        {/* SETTINGS */}
        {activePage === "settings" && (
          <div className="relative z-10 mx-auto w-full max-w-[1500px] px-6 py-6">
            <SettingsPage />
          </div>
        )}

        {/* CHANGELOG */}
        {activePage === "changelog" && (
          <div className="relative z-10 mx-auto w-full max-w-[1500px] px-6 py-6">
            <ChangelogPage />
          </div>
        )}
          {/* ABOUT */}
        {activePage === "about" && (
          <div className="relative z-10 mx-auto w-full max-w-[1500px] px-6 py-6">
            <AboutPage />
          </div>
        )}
          </div>
      </div>
  )
}

function App() {
  const [
    showSplash,
    setShowSplash,
  ] = useState(true)

  const [
    profiles,
    setProfiles,
  ] = useState<Profile[]>([])

  const [
    activeProfile,
    setActiveProfile,
  ] = useState<Profile | null>(
    null
  )

  const [
    isProfilesReady,
    setIsProfilesReady,
  ] = useState(false)

  const [
    isCreateProfileOpen,
    setIsCreateProfileOpen,
  ] = useState(false)

  const [
    profileError,
    setProfileError,
  ] = useState<string | null>(
    null
  )

  const [
    importPreview,
    setImportPreview,
  ] = useState<ImportedProfileFile | null>(
    null
  )

  useEffect(() => {
    let cancelled = false

    const loadProfileSession =
      async () => {
        try {
          const [
            storedProfiles,
            activeProfileId,
          ] = await Promise.all([
            loadProfiles(),
            loadActiveProfileId(),
          ])

          if (cancelled) {
            return
          }

          setProfiles(
            storedProfiles
          )

          if (activeProfileId) {
            const profile =
              storedProfiles.find(
                (item) =>
                  item.id ===
                  activeProfileId
              )

            if (profile) {
              const profileData =
                await loadProfileData(
                  profile.id
                )

              if (cancelled) {
                return
              }

              if (profileData) {
                setActiveProfile(
                  profile
                )
              } else {
                await clearActiveProfileId()
              }
            } else {
              await clearActiveProfileId()
            }
          }
        } catch (error) {
          console.error(
            "Could not load profiles:",
            error
          )

          if (!cancelled) {
            setProfileError(
              "Could not load profiles."
            )
          }
        } finally {
          if (!cancelled) {
            setIsProfilesReady(
              true
            )
          }
        }
      }

    void loadProfileSession()

    return () => {
      cancelled = true
    }
  }, [])

  const handleSelectProfile =
    async (profile: Profile) => {
      setProfileError(null)

      try {
        const profileData =
          await loadProfileData(
            profile.id
          )

        if (!profileData) {
          setProfileError(
            "Profile data could not be found."
          )

          return
        }

        await saveActiveProfileId(
          profile.id
        )

        setActiveProfile(profile)
      } catch (error) {
        console.error(
          "Could not open profile:",
          error
        )

        setProfileError(
          "Could not open profile."
        )
      }
    }
  const handleRenameProfile =
  async (
    profile: Profile,
    newName: string
  ) => {
    setProfileError(null)

    try {
      const updatedProfiles =
        await renameProfile(
          profile.id,
          newName
        )

      setProfiles(updatedProfiles)

      if (
        activeProfile?.id ===
        profile.id
      ) {
        const updatedProfile =
          updatedProfiles.find(
            (item) =>
              item.id === profile.id
          )

        if (updatedProfile) {
          setActiveProfile(
            updatedProfile
          )
        }
      }
    } catch (error) {
      console.error(
        "Could not rename profile:",
        error
      )

      setProfileError(
        "Could not rename profile."
      )
    }
  }


  const handleCreateProfile =
    async (name: string) => {
      setProfileError(null)

      let createdProfile:
        | Profile
        | null = null

      try {
        createdProfile =
          await createProfile(name)

       const profileData =
        createEmptyProfileData(
          umaVersions.map(
            (version) => version.id
          )
        )

        await saveProfileData(
          createdProfile.id,
          profileData
        )

        await saveActiveProfileId(
          createdProfile.id
        )

        setProfiles(
          (current) => [
            ...current,
            createdProfile as Profile,
          ]
        )

        setActiveProfile(
          createdProfile
        )

        setIsCreateProfileOpen(
          false
        )
      } catch (error) {
        console.error(
          "Could not create profile:",
          error
        )

        /*
         * Jeśli udało się utworzyć wpis
         * profilu, ale zapis danych się
         * nie udał, cofamy wpis z listy.
         *
         * Stare uma-tracker-data.json
         * pozostaje nietknięte.
         */
        if (createdProfile) {
          try {
            await saveProfiles(
              profiles
            )
          } catch (
            rollbackError
          ) {
            console.error(
              "Could not rollback profile:",
              rollbackError
            )
          }
        }

        setProfileError(
          "Could not create profile."
        )
      }
    }

    const handleDeleteProfile =
  async (profile: Profile) => {
    setProfileError(null)

    try {
      await deleteProfileData(
        profile.id
      )

      const updatedProfiles =
        await deleteProfile(
          profile.id
        )

      setProfiles(
        updatedProfiles
      )

      if (
        activeProfile?.id ===
        profile.id
      ) {
        await clearActiveProfileId()
        setActiveProfile(null)
      }
    } catch (error) {
      console.error(
        "Could not delete profile:",
        error
      )

      setProfileError(
        "Could not delete profile."
      )
    }
  }
    const handleChooseImportProfile = () => {
      setProfileError(null)

      const input =
        document.createElement("input")

      input.type = "file"
      input.accept =
        ".json,application/json"

      input.onchange = async () => {
        const file = input.files?.[0]

        if (!file) {
          return
        }

        try {
          const fileContents =
            await file.text()

          const parsed: unknown =
            JSON.parse(fileContents)

          if (
            !isImportedProfileFile(parsed)
          ) {
            setProfileError(
              "This file is not a valid Umamusume Tracker profile."
            )

            return
          }

          setImportPreview(parsed)
        } catch (error) {
          console.error(
            "Could not read imported profile:",
            error
          )

          const message =
            error instanceof Error
              ? error.message
              : String(error)

          setProfileError(
            `Could not import profile: ${message}`
          )
        }
      }

      input.click()
    }

  const handleConfirmImportProfile =
  async () => {
    if (!importPreview) {
      return
    }

    setProfileError(null)

    const sourceProfileId =
      importPreview.profile
        .sourceProfileId

    const alreadyExists =
      profiles.some(
        (profile) =>
          (
            profile.sourceProfileId ??
            profile.id
          ) === sourceProfileId
      )

    if (alreadyExists) {
      return
    }

    let createdProfile:
      | Profile
      | null = null

    try {
      createdProfile =
        await createProfile(
          importPreview.profile.name,
          sourceProfileId
        )

      await saveProfileData(
        createdProfile.id,
        importPreview.data
      )

      setProfiles((current) => [
        ...current,
        createdProfile as Profile,
      ])

      setImportPreview(null)
    } catch (error) {
      console.error(
        "Could not import profile:",
        error
      )

      if (createdProfile) {
        try {
          await deleteProfileData(
            createdProfile.id
          )

          const updatedProfiles =
            await deleteProfile(
              createdProfile.id
            )

          setProfiles(
            updatedProfiles
          )
        } catch (rollbackError) {
          console.error(
            "Could not rollback imported profile:",
            rollbackError
          )
        }
      }

      setProfileError(
        "Could not import profile."
      )
    }
  }


  const handleExportProfile =
  async (profile: Profile) => {
    setProfileError(null)

    try {
      const profileData =
        await loadProfileData(profile.id)

      if (!profileData) {
        setProfileError(
          "Profile data could not be found."
        )

        return
      }

      const exportData = {
        format: "uma-tracker-profile",
        version: 1,

        profile: {
          sourceProfileId:
          profile.sourceProfileId ??
          profile.id,
          name: profile.name,
        },

        data: profileData,
      }

      const safeProfileName =
        profile.name
          .trim()
          .replace(
            /[<>:"/\\|?*\x00-\x1F]/g,
            "_"
          )
          .replace(/[. ]+$/g, "") ||
        "profile"

      const json = JSON.stringify(
        exportData,
        null,
        2
      )

      const blob = new Blob(
        [json],
        {
          type: "application/json",
        }
      )

      const url =
        URL.createObjectURL(blob)

      const link =
        document.createElement("a")

      link.href = url
      link.download =
        `uma-tracker-${safeProfileName}.json`

      document.body.appendChild(link)

      link.click()
      link.remove()

      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 0)
    } catch (error) {
  console.error(
    "Could not export profile:",
    error
  )

  const message =
    error instanceof Error
      ? error.message
      : String(error)

  setProfileError(
    `Could not export profile: ${message}`
  )
}
  }

  if (showSplash) {
    return (
      <SplashScreen
        onFinished={() =>
          setShowSplash(false)
        }
      />
    )
  }

  if (!isProfilesReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030811] text-sm font-bold text-blue-100/40">
        Loading profiles...
      </div>
    )
  }

  if (!activeProfile) {
    return (
      <>
         {profiles.length === 0 ? (
          <WelcomePage
            onCreateTracker={() =>
              setIsCreateProfileOpen(true)
            }
            onImportBackup={() => {
              void handleChooseImportProfile()
            }}
          />
        ) : (
        <ProfileSelectionPage
        profiles={profiles}
        onSelectProfile={(profile) => {
          void handleSelectProfile(profile)
        }}
        onCreateProfile={() =>
          setIsCreateProfileOpen(true)
        }
        onRenameProfile={(
          profile,
          newName
        ) => {
          void handleRenameProfile(
            profile,
            newName
          )
        }}
        onDeleteProfile={(profile) => {
          void handleDeleteProfile(profile)
        }}
        onExportProfile={(profile) => {
        void handleExportProfile(profile)
      }}
        onImportProfile={() => {
          void handleChooseImportProfile()
        }}
      />
      )}
        {profileError && (
          <div className="fixed left-1/2 top-6 z-[1200] -translate-x-1/2 rounded-lg border border-red-300/20 bg-red-950/90 px-4 py-2 text-xs font-bold text-red-100 shadow-xl">
            {profileError}
          </div>
        )}

        {isCreateProfileOpen && (
          <CreateProfileModal
            onCreate={(name) => {
              void handleCreateProfile(
                name
              )
            }}
            onClose={() =>
              setIsCreateProfileOpen(
                false
              )
            }
          />
        )}
        {importPreview && (() => {
  const alreadyExists =
    profiles.some(
      (profile) =>
        (
          profile.sourceProfileId ??
          profile.id
        ) ===
        importPreview.profile
          .sourceProfileId
    )

  const favoriteUma =
  umaVersions.find(
    (version) =>
      version.id ===
      importPreview.data
        .favoriteUmaId
  )
  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-violet-300/20 bg-[#07111f] shadow-2xl">

        <div className="border-b border-white/[0.07] px-6 py-5">
          <div className="text-[10px] font-black uppercase tracking-[0.20em] text-violet-300/50">
            Profile Tools
          </div>

          <div className="mt-1 text-xl font-black text-white">
            Import Profile
          </div>

          <div className="mt-1 text-sm text-blue-100/35">
            Review the profile before importing it.
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-center gap-4 rounded-xl border border-violet-300/15 bg-violet-400/[0.04] px-4 py-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-violet-300/20 bg-violet-400/[0.07]">
            {favoriteUma?.avatar ? (
              <UmaAvatarImage
                avatar={favoriteUma.avatar}
                alt={favoriteUma.displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-black text-violet-200">
                {importPreview.profile.name
                  .trim()
                  .charAt(0)
                  .toUpperCase() || "?"}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-100/30">
              Trainer Profile
            </div>

            <div className="mt-1 truncate text-xl font-black text-white">
              {importPreview.profile.name}
            </div>
          </div>
        </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-white/[0.07] bg-black/15 px-3 py-3">
              <div className="text-[9px] font-black uppercase tracking-wide text-blue-100/30">
                Champions Meetings
              </div>

              <div className="mt-1 text-xl font-black text-white">
                {importPreview.data.cms.length}
              </div>
            </div>

            <div className="rounded-lg border border-white/[0.07] bg-black/15 px-3 py-3">
              <div className="text-[9px] font-black uppercase tracking-wide text-blue-100/30">
                League of Heroes
              </div>

              <div className="mt-1 text-xl font-black text-white">
                {importPreview.data.lohs.length}
              </div>
            </div>

            <div className="col-span-2 rounded-lg border border-white/[0.07] bg-black/15 px-3 py-3">
            <div className="text-[9px] font-black uppercase tracking-wide text-blue-100/30">
              Custom Umamusume
            </div>

            <div className="mt-1 text-xl font-black text-white">
              {
                importPreview.data
                  .customUmaDatabase
                  .customVersions.length
              }
            </div>
          </div>
          </div>

          <div className="mt-3 rounded-lg border border-white/[0.07] bg-black/15 px-3 py-3">
            <div className="text-[9px] font-black uppercase tracking-wide text-blue-100/30">
              Favorite Uma
            </div>

            <div className="mt-1 text-sm font-black text-violet-200">
              {favoriteUma?.displayName ??
                "None"}
            </div>
          </div>

          {alreadyExists && (
            <div className="mt-4 rounded-xl border border-red-300/20 bg-red-400/[0.06] px-4 py-3">
              <div className="text-xs font-black text-red-200">
                This profile already exists.
              </div>

              <div className="mt-1 text-xs leading-relaxed text-red-100/55">
                Delete the existing profile before importing this backup.
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-white/[0.07] px-6 py-4">
          <button
            type="button"
            onClick={() =>
              setImportPreview(null)
            }
            className="rounded-lg border border-white/[0.08] px-4 py-2 text-xs font-bold text-blue-100/50 transition hover:border-white/[0.15] hover:text-white"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={alreadyExists}
            onClick={() => {
              void handleConfirmImportProfile()
            }}
            className="rounded-lg border border-violet-300/25 bg-violet-400/[0.10] px-4 py-2 text-xs font-black text-violet-200 transition hover:border-violet-300/45 hover:bg-violet-400/[0.16] disabled:cursor-not-allowed disabled:opacity-30"
          >
            Import Profile
          </button>
        </div>

      </div>
    </div>
  )
})()}
      </>
      
    )
  }

  

  return (
    <UmaDatabaseProvider
  key={activeProfile.id}
  profileId={activeProfile.id}
>
  <AutoRunTimerProvider
    profileId={activeProfile.id}
  >
    <AppContent
      profileId={activeProfile.id}
      profileName={activeProfile.name}
      onProfilesClick={() => {
        void clearActiveProfileId()
        setActiveProfile(null)
      }}
    />
  </AutoRunTimerProvider>
</UmaDatabaseProvider>
  )
}

export default App