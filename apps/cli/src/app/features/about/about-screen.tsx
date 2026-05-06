import { APP_VERSION } from "../../version"

export function AboutScreen() {
  return (
    <box width="100%" height="100%" justifyContent="center" alignItems="center">
      <box width={80} flexDirection="column" gap={1}>
        <text>
          <strong>About</strong>
        </text>
        <text>puhutko-lite is a vocabulary learning notebook and an interactive dictionary.</text>
        <text>It lets you add your own tags and example notes to each word.</text>
        <text>Author: Hien Pham</text>
        <text>Data credits: kaikki.org and Wiktionary contributors (wiktionary.org).</text>
        <text>Current version: {APP_VERSION}</text>
      </box>
    </box>
  )
}
