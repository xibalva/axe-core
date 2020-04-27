import { version } from '../../package.json';

let axeVersion = version;

export function getVersion() {
  return axeVersion;
}

export function setVersion(value) {
  axeVersion = value;
}