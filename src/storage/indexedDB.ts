import { notifyStorageChanged } from "./storageChanges"

const DATABASE_NAME = "uma-pct"
const DATABASE_VERSION = 1
export const STORE_NAME = "app-data"

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      DATABASE_NAME,
      DATABASE_VERSION
    )

    request.onupgradeneeded = () => {
      const database = request.result

      if (
        !database.objectStoreNames.contains(
          STORE_NAME
        )
      ) {
        database.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

export async function getStoredValue<T>(
  key: string
): Promise<T | undefined> {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      STORE_NAME,
      "readonly"
    )

    const store =
      transaction.objectStore(STORE_NAME)

    const request = store.get(key)

    request.onsuccess = () => {
      resolve(request.result as T | undefined)
    }

    request.onerror = () => {
      reject(request.error)
    }

    transaction.oncomplete = () => {
      database.close()
    }
  })
}

export async function setStoredValue<T>(
  key: string,
  value: T
): Promise<void> {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      STORE_NAME,
      "readwrite"
    )

    const store =
      transaction.objectStore(STORE_NAME)

    let failure: unknown
    try { store.put(value, key) } catch (error) { failure = error; transaction.abort() }

    transaction.oncomplete = () => {
      database.close()
      notifyStorageChanged(key)
      resolve()
    }

    transaction.onabort = () => {
      database.close()
      reject(failure ?? transaction.error)
    }
  })
}

export async function deleteStoredValue(
  key: string
): Promise<void> {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      STORE_NAME,
      "readwrite"
    )

    const store =
      transaction.objectStore(STORE_NAME)

    let failure: unknown
    try { store.delete(key) } catch (error) { failure = error; transaction.abort() }

    transaction.oncomplete = () => {
      database.close()
      notifyStorageChanged(key)
      resolve()
    }

    transaction.onabort = () => {
      database.close()
      reject(failure ?? transaction.error)
    }
  })
}
