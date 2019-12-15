'use strict'

const { notarize } = require('electron-notarize')

async function main(context) {
  const { electronPlatformName, appOutDir } = context
  if (electronPlatformName !== 'darwin') {
    return
  }

  const appName = context.packager.appInfo.productFilename
  const appleId = 'cedric.verstraeten@sap.com'

  await notarize({
    appBundleId: 'io.kerberos.etcher',
    appPath: `${appOutDir}/${appName}.app`,
    appleId,
    appleIdPassword: `@keychain:AC_PASSWORD`
  })
}

exports.default = main
