// Loads, parses, and displays a validator list

// import { RippleAPI } from 'ripple-lib';
import * as addressCodec from 'ripple-address-codec';
import * as binaryCodec from 'ripple-binary-codec';
import fetch from 'node-fetch';

interface RawValidatorList {
  public_key?: string;
  manifest: string;
  blob: string;
  signature: string;
  version: number;
};

export interface Manifest {
  Sequence: number;
  PublicKey: string;
  SigningPubKey: string;
  Signature: string;
  MasterSignature: string;
}

export interface VLBlob {
  sequence: number;
  expiration: number;
  validators: Validator[];
}

export interface Validator {
  validation_public_key: string;
  manifest: string; // raw manifest (base64)
}

export async function fetchVL(validatorListUrl: string): Promise<RawValidatorList> {
  return fetch(validatorListUrl)
    .then(res => res.json());
}

// TODO: consider adding a `decodeManifest` method to rbc
function decodeBase64Manifest(manifest: string): Manifest {
  // .toUpperCase() is only needed with ripple-binary-codec < 1.0
  return <unknown>binaryCodec.decode(Buffer.from(manifest, 'base64').toString('hex').toUpperCase()) as Manifest;
}

interface FormatOptions {
  obj: any;
  prefix: string;
}

function format({obj, prefix}: FormatOptions): string {
  return Object.keys(obj).reduce((acc, cur, idx, src) => {
    return acc + prefix + cur.padEnd('MasterSignature'.length, ' ') + ': ' + obj[cur] + '\n';
  }, '');
}

export async function start(): Promise<void> {
  if (process.argv.length > 2) {
    console.warn('args not yet implemented:', process.argv);
  }

  // const list = await fetchVL('https://vl.ripple.com');
  const list = await fetchVL('https://s1.ripple.com:51235/vl/ED2677ABFFD1B33AC6FBC3062B71F1E8397C1505E1C42C64D11AD1B28FF73F4734');

  console.log();

  if (list.public_key) {
    const publicKeyBytes = Buffer.from(list.public_key, 'hex');
    const nodePublic = addressCodec.encodeNodePublic(publicKeyBytes);

    console.log('Public key:', list.public_key);
    console.log('Base58 fmt:', nodePublic);
  }

  console.log();

  console.log('Manifest  :', decodeBase64Manifest(list.manifest));
  // TODO: verify signature

  console.log();

  const blob: VLBlob = JSON.parse(Buffer.from(list.blob, 'base64').toString())

  console.log('Blob  :');
  console.log('  sequence  :', blob.sequence);
  console.log('  expiration:', blob.expiration); // TODO: convert
  console.log('  validators:', `(${blob.validators.length} validators)`); // TODO: convert
  for (let i = 0; i < blob.validators.length; i++) {
    console.log(`  ${('0' + (i + 1)).slice(-2)}.`, blob.validators[i].validation_public_key);
    console.log(`      Manifest:`);
    const manifest = decodeBase64Manifest(blob.validators[i].manifest);
    console.log(format({obj: manifest, prefix: '        '}));

    console.log('        Encoded Public Key:', addressCodec.encodeNodePublic(Buffer.from(blob.validators[i].validation_public_key, 'hex')));
    console.log('        Encoded SigningKey:', addressCodec.encodeNodePublic(Buffer.from(manifest.SigningPubKey, 'hex')));
    console.log();
  }

  console.log();
  console.log('Signature:', list.signature);
  console.log('Version  :', list.version);

  // const xrpl = new RippleAPI();
  // xrpl.generateAddress({})
}

// function parseVL() {
//   request.get({
//     url: valListUrl, // Use https://vl.ripple.com/ by default; TODO: accept custom VL URL
//     json: true
//   }).then(data => {
//     let buff = Buffer.from(data.blob, 'base64');
//     const valList = JSON.parse(buff.toString('ascii'))

//     if (valList.sequence <= valListSeq) {
//       return
//     }

//     valListSeq = valList.sequence

//     let oldValidators = Object.keys(validators)

//     const startup = !oldValidators.length
//     for (const validator of valList.validators) {
//       const pubkey = hextoBase58(validator.validation_public_key)
//       remove(oldValidators, pubkey)

//       const manifest = parseManifest(validator.manifest)

//       if (!validators[pubkey] || validators[pubkey].seq < manifest.Sequence) {
//         if (validators[pubkey]) {
//           delete manifestKeys[validators[pubkey].signing_key]
//         } else {
//           validators[pubkey] = {}
//           if (getName(pubkey)===pubkey)
//             setName(pubkey)
//           if (!startup)
//             messageSlack('<!channel> :tada: new trusted validator: `' + getName(pubkey) +'`')
//         }
//         validators[pubkey].signing_key = hextoBase58(manifest.SigningPubKey)
//         validators[pubkey].seq = manifest.Sequence
//         manifestKeys[validators[pubkey].signing_key] = pubkey
//         if (!startup)
//           messageSlack('<!channel> :scroll: new manifest for: `' + getName(pubkey) +'`: #' + validators[pubkey].seq + ', `'+ validators[pubkey].signing_key +'`')
//       }
//     }
//     for (const validator of oldValidators) {
//       delete validators[validator]
//     }
//     console.log(validators)
//     console.log(manifestKeys)
//   });
// }
