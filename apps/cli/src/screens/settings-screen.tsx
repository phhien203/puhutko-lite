import React from "react"
import { useOutletContext } from "react-router"
import { Autocomplete } from "../components/autocomplete"

type SettingsScreenOutletContext = {
  setAutocompleteActive: (active: boolean) => void
}

type MockUser = {
  id: string
  label: string
  value: string
  name: string
  handle: string
  city: string
}

const mockUsers: MockUser[] = [
  {
    id: "1",
    label: "Ada Lovelace",
    value: "Ada Lovelace",
    name: "Ada Lovelace",
    handle: "@ada",
    city: "London",
  },
  {
    id: "2",
    label: "Alan Turing",
    value: "Alan Turing",
    name: "Alan Turing",
    handle: "@aturing",
    city: "Manchester",
  },
  {
    id: "3",
    label: "Grace Hopper",
    value: "Grace Hopper",
    name: "Grace Hopper",
    handle: "@ghopper",
    city: "New York",
  },
  {
    id: "4",
    label: "Linus Torvalds",
    value: "Linus Torvalds",
    name: "Linus Torvalds",
    handle: "@linus",
    city: "Helsinki",
  },
  {
    id: "5",
    label: "Margaret Hamilton",
    value: "Margaret Hamilton",
    name: "Margaret Hamilton",
    handle: "@mhamilton",
    city: "Paoli",
  },
  {
    id: "6",
    label: "Radia Perlman",
    value: "Radia Perlman",
    name: "Radia Perlman",
    handle: "@radia",
    city: "Portsmouth",
  },
]

async function loadUsers(query: string, signal: AbortSignal): Promise<MockUser[]> {
  signal.throwIfAborted()

  return new Promise((resolve, reject) => {
    const normalizedQuery = query.trim().toLowerCase()
    const timeoutId = setTimeout(() => {
      signal.removeEventListener("abort", handleAbort)

      const filteredUsers = mockUsers.filter((user) => {
        const searchTarget = `${user.name} ${user.handle} ${user.city}`.toLowerCase()
        return searchTarget.includes(normalizedQuery)
      })

      resolve(filteredUsers)
    }, 350)

    const handleAbort = () => {
      clearTimeout(timeoutId)
      signal.removeEventListener("abort", handleAbort)
      reject(new DOMException("The request was aborted.", "AbortError"))
    }

    signal.addEventListener("abort", handleAbort, { once: true })
  })
}

export function SettingsScreen() {
  const { setAutocompleteActive } = useOutletContext<SettingsScreenOutletContext>()
  const [query, setQuery] = React.useState("")
  const [selectedUser, setSelectedUser] = React.useState<MockUser | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const createCustomUser = React.useCallback(
    (nextValue: string): MockUser => ({
      id: `custom:${nextValue}`,
      label: nextValue,
      value: nextValue,
      name: nextValue,
      handle: "",
      city: "",
    }),
    [],
  )

  React.useEffect(() => {
    return () => {
      setAutocompleteActive(false)
    }
  }, [setAutocompleteActive])

  const handleQueryChange = (nextValue: string) => {
    setQuery(nextValue)
    // setSelectedUser(null)
    setErrorMessage(null)
  }

  const handleError = (error: unknown) => {
    if (error instanceof Error && error.message.length > 0) {
      setErrorMessage(error.message)
      return
    }

    setErrorMessage("Failed to load suggestions.")
  }

  return (
    <box width="100%" height="100%" justifyContent="center" alignItems="center">
      <box width={56} flexDirection="column" gap={1}>
        <text>
          <strong>Settings</strong>
        </text>

        <text>Search for a teammate to simulate an async settings lookup.</text>



        {selectedUser ? (
          <text>
            Selected: <strong>{selectedUser.value}</strong>
          </text>
        ) : (
          <text>
            <span fg="gray">No teammate selected yet.</span>
          </text>
        )}

        {errorMessage ? (
          <text>
            <span fg="red">{errorMessage}</span>
          </text>
        ) : null}

        <text>
          <span fg="gray">Esc closes suggestions first, then clears the query.</span>
        </text>

        <Autocomplete
          value={query}
          onChange={handleQueryChange}
          onSelect={setSelectedUser}
          loaderFn={loadUsers}
          createItemFromValue={createCustomUser}
          onError={handleError}
          onActiveChange={setAutocompleteActive}
          placeholder="Type at least 2 characters"
        />
      </box>
    </box>
  )
}
