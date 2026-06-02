import { ProShell } from '@proappstore/sdk/shell'
import { app } from './lib/app'
import { CleanMarket } from './components/CleanMarket'

export default function App() {
  return (
    <ProShell app={app} appName="CleanMarket" allowFree>
      <CleanMarket />
    </ProShell>
  )
}
