import {
  deleteStoredValue,
  getStoredValue,
  setStoredValue,
} from "../storage/indexedDB"

const ACTIVE_PROFILE_KEY =
  "session:activeProfileId"

export async function loadActiveProfileId(): Promise<
  string | null
> {
  const profileId =
    await getStoredValue<string>(
      ACTIVE_PROFILE_KEY
    )

  return profileId ?? null
}

export async function saveActiveProfileId(
  profileId: string
): Promise<void> {
  await setStoredValue(
    ACTIVE_PROFILE_KEY,
    profileId
  )
}

export async function clearActiveProfileId(): Promise<void> {
  await deleteStoredValue(
    ACTIVE_PROFILE_KEY
  )
}

export type AutoRunTimerState = {
  endsAt: number
}

function getAutoRunTimerKey(
  profileId: string
) {
  return `session:autoRunTimer:${profileId}`
}

export async function loadAutoRunTimer(
  profileId: string
): Promise<AutoRunTimerState | null> {
  const timer =
    await getStoredValue<AutoRunTimerState>(
      getAutoRunTimerKey(profileId)
    )

  return timer ?? null
}

export async function saveAutoRunTimer(
  profileId: string,
  timer: AutoRunTimerState
): Promise<void> {
  await setStoredValue(
    getAutoRunTimerKey(profileId),
    timer
  )
}

export async function clearAutoRunTimer(
  profileId: string
): Promise<void> {
  await deleteStoredValue(
    getAutoRunTimerKey(profileId)
  )
}

export type AutoRunStaminaState = {
  currentStamina: number
  maxStamina: number
  updatedAt: number

  regenMinutesPerStamina: number
  baseAutoRunCost: number

  halfStaminaCostEvent: boolean
  doubleStaminaCostEvent: boolean
}

function getAutoRunStaminaKey(
  profileId: string
) {
  return `session:autoRunStamina:${profileId}`
}

export async function loadAutoRunStamina(
  profileId: string
): Promise<AutoRunStaminaState | null> {
  const stamina =
    await getStoredValue<AutoRunStaminaState>(
      getAutoRunStaminaKey(profileId)
    )

  return stamina ?? null
}

export async function saveAutoRunStamina(
  profileId: string,
  stamina: AutoRunStaminaState
): Promise<void> {
  await setStoredValue(
    getAutoRunStaminaKey(profileId),
    stamina
  )
}

export async function clearAutoRunStamina(
  profileId: string
): Promise<void> {
  await deleteStoredValue(
    getAutoRunStaminaKey(profileId)
  )
}