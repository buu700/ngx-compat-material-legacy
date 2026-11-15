/**
 * @license Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. MIT.
 */
/** Finite old/current source identities. This is preparation data, not admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync,readdirSync,readlinkSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';

const SELF='scripts/retained-current-context-identity.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const PACKET={path:'compatibility/rc/main-retained-current-context-v1.json',sha256:'d47e05229546ccceec4e84d6cdffc5a430a2db2a0b019094b491878a8645af60',bytes:1351942};
const BASE='4e6f608402e99da9fb550bb46040aa68a648440a';
const SUCCESSOR='5064419bd6dd267bb26fe4562c36c40c3aa3bd5d';
const SUCCESSOR_TREE='11504a891db8b74b8f52bae92c085fbcde210888';
// Exact reviewed source transitions, authenticated against both Git bodies.
const DELTA=[
 {
  "path": "projects/ngx-material-legacy/legacy-form-field/form-field.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-form-field/form-field.ts",
   "sha256": "e6204762c0899cfc038d28c7eb3918d291766b3179b6a7bf0b4630f59c6cd657",
   "bytes": 28485,
   "blob_oid": "c7d43a56f73980f43e8345dba29a01639d7a59ab"
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-form-field/form-field.ts",
   "blob_oid": "aff83b932a55e778cfa1d74dccfb1810e1fbf764",
   "sha256": "e645f8b92ccb57518eb9fac6ab3a20c35db6bd9f19a301fcb659ffe58911cfb6",
   "bytes": 28628
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-form-field/hint.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-form-field/hint.ts",
   "sha256": "c129fc51d60d9a7f2c273da3c8ee195719df230c9c7a1925abf1dc969f581b05",
   "bytes": 1524,
   "blob_oid": "1bec7c45e6d0b26d54b87568f782662a8a16641c"
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-form-field/hint.ts",
   "blob_oid": "d3e8c84003946ac1052ade5ff5ecbaaafd1286ef",
   "sha256": "7685890918a25081de81d83f6a9c1396274c2b936e239f713c44bc67151fed49",
   "bytes": 1544
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-form-field/internal/hint-id.ts",
  "before": null,
  "after": {
   "path": "projects/ngx-material-legacy/legacy-form-field/internal/hint-id.ts",
   "blob_oid": "c86b8a9d280066c658925b8d9cfb5b4c5d07f8ab",
   "sha256": "160c30388347d5bf00f075de3423e969e6e4ce8f7fe32c7d4dafe4e17dcc4028",
   "bytes": 465
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-table/table.spec.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-table/table.spec.ts",
   "sha256": "6987ae268b614e3d445852fe9eb99e05d1f7c6c5669505079ed142586ab47d1e",
   "bytes": 48314,
   "blob_oid": "9c18510f9a254a485d6eea195f7c3be14d224c41"
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-table/table.spec.ts",
   "blob_oid": "3aa1756308737cf33f356ec7810a340116cf6d31",
   "sha256": "a6d1f377085d4a05c2283e80f123fe1068beeec8f720310f30d4f149403c1424",
   "bytes": 53676
  }
 },
 {
  "path": "scripts/run-legacy-tests.mjs",
  "before": {
   "path": "scripts/run-legacy-tests.mjs",
   "sha256": "b5e4072a685bddb7c738f0c3d9fe830ebf4ae06a499bf4a5783aab7354bd2fbc",
   "bytes": 4534,
   "blob_oid": "a02ebbd70abfae6e93e7eba047f1ab79192e35b6"
  },
  "after": {
   "path": "scripts/run-legacy-tests.mjs",
   "blob_oid": "6bb037f2f33520559df7b2efcd0fd567dc4f2edf",
   "sha256": "3885187cf0e3a8f25a86434e301377b704e87603a65acaf89cbd8a42affaa0dc",
   "bytes": 7090
  }
 },
 {
  "path": "testing/legacy-runner/karma.conf.cjs",
  "before": {
   "path": "testing/legacy-runner/karma.conf.cjs",
   "sha256": "7412ad8ed75d858a13d912720a47522c0b3a73f2165046b60c0bea94efe1b952",
   "bytes": 1723,
   "blob_oid": "68aa82aa83cfc3dc0ea498b4a98e63c20c75ab49"
  },
  "after": {
   "path": "testing/legacy-runner/karma.conf.cjs",
   "blob_oid": "934e45bb8645d53a09ac7e863d98ff4eda225e60",
   "sha256": "1a4789fe581af6903a6cdf719d9548632a885879c8b3929ed6a3f839d588c9e0",
   "bytes": 1910
  }
 }
];

const CURRENT='d443a7671cb7c5bbbd20211e5806a5de61b4af9e';
const CURRENT_TREE='308696d5d422ef266930312109c0ee14fcd476f9';
// Exact committed successor-to-current transition; both bodies are verified below.
const CURRENT_DELTA=[
 {
  "path": "flake.nix",
  "before": {
   "path": "flake.nix",
   "blob_oid": "535c68ad80cc03e36cdeeef29a18f3515da43866",
   "sha256": "a161c9773fdb018e4a1a7befdb5962c1f4e818d73ae259b4242673bad1115556",
   "bytes": 3144
  },
  "after": {
   "path": "flake.nix",
   "blob_oid": "e4dc61c3c40ee75a64db5c3f385a26cc09b032e1",
   "sha256": "8292b17e681c9a94621238e0b6aa8a74357f5327573b825cb6f1ef6d6eab0d42",
   "bytes": 3252
  }
 },
 {
  "path": "projects/ngx-material-legacy/internal/testing/owned-animation-modules.ts",
  "before": {
   "path": "projects/ngx-material-legacy/internal/testing/owned-animation-modules.ts",
   "blob_oid": "4fe7932289c427b17a8deb6960b7e716fd1b3eae",
   "sha256": "dc86cb38212f75fc5e8915d7b39b757da69068b75c8829f91d840a8d89fc0500",
   "bytes": 845
  },
  "after": {
   "path": "projects/ngx-material-legacy/internal/testing/owned-animation-modules.ts",
   "blob_oid": "94db14ec78b1a26f971f3e1e810784ea86723588",
   "sha256": "f79c4f255706e1d031d58826853031df863f2975a2e8f5f73cd12afe5bc3614c",
   "bytes": 901
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts",
   "blob_oid": "bd27911aab82142c83e4ceaf3827ae1f70eefd9b",
   "sha256": "b831b4d3ac6f17f0a9de9d0cd5594f6154ab5fe2b479e9a3b5289dbc1aeed1b6",
   "bytes": 168183
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts",
   "blob_oid": "99638f92a1fb56bcd807f91998373306d1976f77",
   "sha256": "dc78585784c90399790f6a771b4a006435ce2677f3e7651857dcca440ea2d881",
   "bytes": 168226
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-button/button.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-button/button.ts",
   "blob_oid": "fc27014ff51c6157af4fe807dffc82fc7ce2b8f4",
   "sha256": "6d37f01619672b62496d5ffb8bec6df6dfe32214893191644d46012424ff5bb4",
   "bytes": 6700
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-button/button.ts",
   "blob_oid": "506af2f5f8edcbc8fc40c293b6e77d95f8145041",
   "sha256": "ea16775994ad396442d6c3a62cc7b0eba2c08bc51e999e56597c666b81a49964",
   "bytes": 6858
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-card/card.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-card/card.ts",
   "blob_oid": "98283a2766717c25809da27edcad28fe9f19c76b",
   "sha256": "2e2c16ba865b712214e0d51a739fd01e20af819e65065e2b99b55cc1433208ad",
   "bytes": 5279
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-card/card.ts",
   "blob_oid": "d103fc0302a9c9c1e15017ba87251cc8e455ec33",
   "sha256": "258d12086d1bd119c120182f7cdad01888405ad2fddd027333761657a04f6214",
   "bytes": 5440
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-checkbox/checkbox.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-checkbox/checkbox.ts",
   "blob_oid": "fb57b56a002b4536d38eba6db4b465a418a663af",
   "sha256": "774db12b55590d631d0a69c68a9aa7289adf600ac3fe62e288dd22fcf3c86766",
   "bytes": 5525
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-checkbox/checkbox.ts",
   "blob_oid": "502712b1c5b4fb09d62b021257f07d3121e03299",
   "sha256": "072e0061972bde4529ba5151444f6ec3f69de326ee9f56941b229fe06366807f",
   "bytes": 5636
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-chips/chip.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-chips/chip.ts",
   "blob_oid": "9c7bb1edbc65c9730bf9cdb14bc41b79f9ef20a8",
   "sha256": "73aea18bc4f77958bc69229ea4954a688d92913bbc59fb52e28f342c2d42a5ae",
   "bytes": 17085
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-chips/chip.ts",
   "blob_oid": "522bc8970d2ac7167273cc4dafd193ca347c08b4",
   "sha256": "04c8cdd43261f67be762c8938c1d901ccc64ac6414f03c9eeb8161ffc64b2a26",
   "bytes": 17196
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-core/internal/legacy-animations.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-core/internal/legacy-animations.ts",
   "blob_oid": "6bbea620d2db8160c91987c7773d5c84191e6d71",
   "sha256": "203162d90b57fa53211f6c8d815b3db33d01b3b221a82a8c29170eeb6385c6f3",
   "bytes": 3438
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-core/internal/legacy-animations.ts",
   "blob_oid": "474024a0c92ee89b6e04db883935d1eeed8a180c",
   "sha256": "97a730e6ecbc37b34e526cd202162049b4c2639a8f7c0dc4f3250d028f7e7b8b",
   "bytes": 3909
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-core/option/option.spec.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-core/option/option.spec.ts",
   "blob_oid": "dce5d864d57ed6404f3446733459e1f67b2b50b5",
   "sha256": "a2ca25c7693a6fb8cf797517346d298f2b81e363e8b1d0348ffa1f91298269f9",
   "bytes": 12184
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-core/option/option.spec.ts",
   "blob_oid": "b67ba5a4cc23fae561f0f2f01df21191b2211298",
   "sha256": "4d4db093a0d4628d86974b53893f68d302063a7a53488e07c039f21021c26f34",
   "bytes": 12184
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-core/pseudo-checkbox/pseudo-checkbox.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-core/pseudo-checkbox/pseudo-checkbox.ts",
   "blob_oid": "ce27255a0884314aab10219b330cfada09ff2287",
   "sha256": "7c6cbffc3f95b6f30b0f599f781d2fcb882b75c308f5cadbffa8107a9fd20758",
   "bytes": 2747
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-core/pseudo-checkbox/pseudo-checkbox.ts",
   "blob_oid": "72275ebe4f0c3b4d4a702936861b175ddeac150d",
   "sha256": "a2351dbd7fe4f7dab87f9ff9e7b3726c26784c290f6f8b8c7440f47cfb86e7d5",
   "bytes": 2793
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-core/public-api.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-core/public-api.ts",
   "blob_oid": "6769ca58e75142b544cb0e5e35fd9058340ee8dd",
   "sha256": "3d56b9e01f502995bd25dea21be8bee5713596655f5d159899858b58b4ffccf2",
   "bytes": 3442
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-core/public-api.ts",
   "blob_oid": "fb59d0d3d104c9be7d353b7897b9008efaaf65b7",
   "sha256": "f78b50ea144140825dc7bcb175b533ddce2f33925ff24c929bdd31dcf339f5bd",
   "bytes": 3497
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-dialog/dialog.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-dialog/dialog.ts",
   "blob_oid": "8f2a7e6b42015f72840fcedf51965cdb9d6c2e62",
   "sha256": "7f7250274cdd11c1e71474553fc7387843262265f8b44c49339b2467abd68f5d",
   "bytes": 2973
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-dialog/dialog.ts",
   "blob_oid": "f51715ce57b9141d84234021c07eefdb6640e20b",
   "sha256": "f61dfeed66de6b3f52507fa6876fa6d7cf32f1786b3cf45486586d5bb18391a0",
   "bytes": 3028
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-form-field/form-field.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-form-field/form-field.ts",
   "blob_oid": "aff83b932a55e778cfa1d74dccfb1810e1fbf764",
   "sha256": "e645f8b92ccb57518eb9fac6ab3a20c35db6bd9f19a301fcb659ffe58911cfb6",
   "bytes": 28628
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-form-field/form-field.ts",
   "blob_oid": "ed01890da5686a6a5e7503b64e33352264fd752c",
   "sha256": "e0fe0631a6adde57f515b82b43156d5da0ab0c2730872df5b792fc27dab14931",
   "bytes": 28656
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-menu/menu.spec.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-menu/menu.spec.ts",
   "blob_oid": "02ea2deadd2b91f1666af870f7b580fa0d01d1c6",
   "sha256": "1f6c9025f1b04dc994e5e77247399546a2464c2281a01a46adeb50c828322321",
   "bytes": 144721
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-menu/menu.spec.ts",
   "blob_oid": "dc2a79a316b90b17abbcc1d3e980f6958fd23875",
   "sha256": "1618f102fbd28b4d8c8eeb1b2d71e10e409f2ad103ebf8082e2b0d27517d6d65",
   "bytes": 144775
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-progress-bar/progress-bar.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-progress-bar/progress-bar.ts",
   "blob_oid": "9efea8b534ef02f9a0c4ba0502610ad0e4157e06",
   "sha256": "815ce6bcc47f7218ee8cc175c84327829c7778ab429fc8b5e137a783e5d7aa3b",
   "bytes": 7572
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-progress-bar/progress-bar.ts",
   "blob_oid": "c6495938f49cc5641034cc19f85aed48a62414ff",
   "sha256": "3afb3707feec6143378e060d1e2b9501d7d0512984919d1f237702340ca4a6b7",
   "bytes": 7735
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-progress-spinner/progress-spinner.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-progress-spinner/progress-spinner.ts",
   "blob_oid": "e97dbd0988c77d42a5793c8501051ffcc73ced0a",
   "sha256": "85936bc7161a1dcbbc377fbf19c3de46b09f13a32adaa3d503d7dc09204c736c",
   "bytes": 12785
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-progress-spinner/progress-spinner.ts",
   "blob_oid": "a4a21d1b7577e51e51371df77ef23df1a7414735",
   "sha256": "2b9b0ef22f95d54e1d4f4b1baf8cffe626f7552b40025935cb448006cb790275",
   "bytes": 12896
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-radio/radio.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-radio/radio.ts",
   "blob_oid": "26e4f3e0c1a7fe2f78fc461c8db1709429eea4ad",
   "sha256": "dffd3e4daf0d50d915303b2e3d13d26e8c97fb77756ccf8c618e34022f548f1e",
   "bytes": 3762
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-radio/radio.ts",
   "blob_oid": "48ee777ddc0a45924f0a69cf784b832b95ecad27",
   "sha256": "0b749baf2f25dcacad39803d51f809f2cca02ed4add03c3199513cdf60b9fb15",
   "bytes": 3873
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-select/internal/select-base.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-select/internal/select-base.ts",
   "blob_oid": "9b09188111b83c3c62e675e04964f47809b68f4b",
   "sha256": "120ab123d79e58ea256211cafa50268dba3ce26524426e88b0347a8624aee68d",
   "bytes": 46730
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-select/internal/select-base.ts",
   "blob_oid": "dfa3c4f108c8fbb3253283be92a95b1d51c59add",
   "sha256": "66e8e28ad78a5bf18cb2563f95fe8df48be821dddc9e124d13fe821ef0734c00",
   "bytes": 47471
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-select/select.spec.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-select/select.spec.ts",
   "blob_oid": "958f19019abfeef3d1219d4936e0ef34912c859d",
   "sha256": "0026c159543c040dc5e8c85baf25f37ec12130cab91841ff651eb96c797940fc",
   "bytes": 233115
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-select/select.spec.ts",
   "blob_oid": "02c6da38a6280017dc8d21905e2a54f2cec0986f",
   "sha256": "b5d7beb6119249251920eb98e9503b9b86cc35ef9349ac82bb290c38e804ac0a",
   "bytes": 238826
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-slide-toggle/slide-toggle.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-slide-toggle/slide-toggle.ts",
   "blob_oid": "e1ec9dba39bbb52b672b397003cf7a943d9dfaec",
   "sha256": "2e0a9754b883f36fd8a8d146515c76fc3883d643794ccb524c9226b309bbbc74",
   "bytes": 5716
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-slide-toggle/slide-toggle.ts",
   "blob_oid": "53f5f8355dd478d68f923a26e48b08a5d11cc7d7",
   "sha256": "f1c46a44a217caf01fe995fc49e1ec7dc1966b1963d45b7234ba7bcbb431314a",
   "bytes": 5827
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-slider/slider.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-slider/slider.ts",
   "blob_oid": "d46f61ffa59654971420e70896f94443d16ad577",
   "sha256": "2dd6d9756260ae23ce7fc1dd55fee8d001a678996f80af0bb04eeee766cb274d",
   "bytes": 36131
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-slider/slider.ts",
   "blob_oid": "4a6f9e78df806ad6021a7f50e4305aa070cdcdbd",
   "sha256": "584d648acc358a46e0ceaf2ffd48d528eedd9536eb3e6ab7c3b30b485ae70aad",
   "bytes": 36289
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-tabs/ink-bar.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-tabs/ink-bar.ts",
   "blob_oid": "4c7581367506b832b10ea253ddad94c44449b1ab",
   "sha256": "739dd3b4acb9c0d9eba8039d47c0d8e7f07d045c6880cfecda4df5168ec28ff3",
   "bytes": 2296
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-tabs/ink-bar.ts",
   "blob_oid": "871cdc95eb9d5ce8f6184052852fd1b6c232f749",
   "sha256": "a36663578ea357161c7678c591416c1cc43dd15dae9f9226bd94c9b37073902b",
   "bytes": 2457
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-tabs/internal/paginated-tab-header.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-tabs/internal/paginated-tab-header.ts",
   "blob_oid": "35be7a43db4a19baa3597e6243b9c89e4117f6f3",
   "sha256": "2c05a1f269d5c56d9e354b81ea0baff88d77602e920911df215bb8d1641b1ac6",
   "bytes": 27093
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-tabs/internal/paginated-tab-header.ts",
   "blob_oid": "01f754bb19c45bae16f1b8f1011f9444d3f50953",
   "sha256": "e117a32b9e5a70780e143504cc0e7cae34442cdebe111ccdfc05253e90721667",
   "bytes": 27321
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-tabs/internal/tab-group-base.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-tabs/internal/tab-group-base.ts",
   "blob_oid": "ce4b225d6a8da845d41a21de8954a92b6f44c256",
   "sha256": "339cd7dee4e6431d4a603b215bf5a78fb654b23dfb49bfe50246cb44af17515e",
   "bytes": 18261
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-tabs/internal/tab-group-base.ts",
   "blob_oid": "ccaffba4050abf77d4ed8dc15655895f9434b305",
   "sha256": "7943cc105951aade5bcae9fb8763cbac0e9413b9ea739d381b6aea30831d3ab6",
   "bytes": 18419
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-tabs/internal/tab-header-base.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-tabs/internal/tab-header-base.ts",
   "blob_oid": "1fc0e42cf590d321521e8a083bca41b06471105d",
   "sha256": "eb75b2bf760e70744c3c85fee76dd2164cbb6b3242cb47f023300ebad0ce2b7e",
   "bytes": 1800
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-tabs/internal/tab-header-base.ts",
   "blob_oid": "48aa18354811ff74a590c9dd3faf3f70c2a6b355",
   "sha256": "c6c5e4da287d930bd14a86643152894c7a1d960fe617def6ad01e2a440d98e50",
   "bytes": 1856
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-tabs/internal/tab-nav-bar-base.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-tabs/internal/tab-nav-bar-base.ts",
   "blob_oid": "d8a4703844b6ab790f2cea408c43ffe8d6575d41",
   "sha256": "daf7d6f4c83292e7d3bf24eaf675b5cfc6c3fe341b779c5e801c23ef49d30f7f",
   "bytes": 10233
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-tabs/internal/tab-nav-bar-base.ts",
   "blob_oid": "a8ee32efba5098c14c232f02730b5365d9bf3d87",
   "sha256": "008255ffdda75f44728754803a78fb032f8491acb1c7976f64d7a15f97d65295",
   "bytes": 10136
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-tabs/tab-group.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-tabs/tab-group.ts",
   "blob_oid": "f38f1386df0e0a31082431d1b695c3eacbf92dc8",
   "sha256": "f4bf197d8dd5f7048e75b8c91655423fe6ed6b6d180866b152100cfb5a04da69",
   "bytes": 2157
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-tabs/tab-group.ts",
   "blob_oid": "4c5fcc4287a50de14d4bb27f9a5a8caade7b848d",
   "sha256": "7ed0657a77371df891557fef7df4b2e9d5276ff121983eb6fd6918fb10015f82",
   "bytes": 2212
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-tabs/tab-header.spec.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-tabs/tab-header.spec.ts",
   "blob_oid": "dc3d5622b4bdaef802b365a8e5918ef0d6abbdd2",
   "sha256": "cb9a251cdfd08314f195c5d3bbc90f6e20f904741aef9cb6bd0e158a6c61604b",
   "bytes": 30243
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-tabs/tab-header.spec.ts",
   "blob_oid": "1dc58c8aa67b58c6d9ebaa40e20a3c2af90c6c07",
   "sha256": "552bd2b949215f12056f47b31d5b8e41d8a7110d5d7d16dda299d7d7df7e0cc8",
   "bytes": 32025
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-tabs/tab-header.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-tabs/tab-header.ts",
   "blob_oid": "f2783a69211ab548ef414fde27c7323c054355a8",
   "sha256": "650d50f3007c67c0c4aa9fa6e63b0fe6f246d7443fcb9967d5943c1fd7e90f9a",
   "bytes": 2713
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-tabs/tab-header.ts",
   "blob_oid": "1f66cfa06c4d2401bb370d843bbd121f43f829aa",
   "sha256": "552b26686c0ae1bfc41345c45507e6b7d040f4d1983daa94888b13c0d2423d88",
   "bytes": 2768
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-tabs/tab-nav-bar/tab-nav-bar.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-tabs/tab-nav-bar/tab-nav-bar.ts",
   "blob_oid": "6e6d07336c53bbd8b55e9f740852447abcd5e4ed",
   "sha256": "89e91390739e518a2a3e9dbdd8d75ff09dfcaa94bfe4bccc73d86f1e577c206c",
   "bytes": 5309
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-tabs/tab-nav-bar/tab-nav-bar.ts",
   "blob_oid": "ddede69102bb899db51ff4c7a1e960c611d007d5",
   "sha256": "4613064c4a0b05cc3551407512252d9f4f485f1ee0db4334b4f2c3e549ecf2fb",
   "bytes": 5364
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts",
   "blob_oid": "9de37584a46e0073f14bf80643e3df03934bda59",
   "sha256": "fc29490be443cdb544e553f762be572fb4e6635216ad47dbb492a5dffa113aad",
   "bytes": 35820
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts",
   "blob_oid": "614a2afc50afbafa279e04912361dd2c7ae68be4",
   "sha256": "da877c1342fb1f8b73e8c33750d94bfac9629ca07dd57c44c92751e674e1b8ed",
   "bytes": 36228
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-tooltip/tooltip.spec.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-tooltip/tooltip.spec.ts",
   "blob_oid": "418608d4d7a361f62f1327abb23d634c8e52a1a2",
   "sha256": "509a20c7a7600499b105c308bcd23c4dd8785b6ced438d97abcde9f246223757",
   "bytes": 60756
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-tooltip/tooltip.spec.ts",
   "blob_oid": "7ef49a2ba64bbea10f92e4981f9ad1b5e2ec6091",
   "sha256": "fbbc7c87c7fa3d09bd95556dc8da1702b72bc9b41e0a06b9f9d5b5d79096dc25",
   "bytes": 62757
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-tooltip/tooltip.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-tooltip/tooltip.ts",
   "blob_oid": "8c916880f6aaf86972948b0e4d4944ce85fae027",
   "sha256": "81924ceadf634a458ec950c217ed10cb0e8d0cb2cbfe3617aaf8a79b61393b29",
   "bytes": 4001
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-tooltip/tooltip.ts",
   "blob_oid": "e3af3d9faa2b1b4cb79896da8dc3a5c2c9ff967c",
   "sha256": "f3913888f304ef75667d307ec8b085db02890bd7c67313098da60b9b3a655911",
   "bytes": 4056
  }
 },
 {
  "path": "projects/ngx-material-legacy/schematics/migrate-legacy/index.js",
  "before": {
   "path": "projects/ngx-material-legacy/schematics/migrate-legacy/index.js",
   "blob_oid": "4d45e40af7af985c570b9c17a74bf4d27e600537",
   "sha256": "f31164def0fb2aab265322093ef17886a59fd684d3b14a8c27ca097de7291b4e",
   "bytes": 4080
  },
  "after": {
   "path": "projects/ngx-material-legacy/schematics/migrate-legacy/index.js",
   "blob_oid": "c06cfeae6925ce52a2b5a3c900f8a5cfbfa8b51d",
   "sha256": "7ce8d647dfc10ee23621cc43a14f5b066a4ae1779040245564dc5a022f16bcdd",
   "bytes": 4684
  }
 },
 {
  "path": "projects/ngx-material-legacy/schematics/migrate-legacy/ts-rewrite.js",
  "before": {
   "path": "projects/ngx-material-legacy/schematics/migrate-legacy/ts-rewrite.js",
   "blob_oid": "e8a3229045512442d840e775263c14c164ef7564",
   "sha256": "95abe0c0ea8c96812cc51a9580f9d78c1c069b9c15cfb276698263e72ea6ba3e",
   "bytes": 12061
  },
  "after": {
   "path": "projects/ngx-material-legacy/schematics/migrate-legacy/ts-rewrite.js",
   "blob_oid": "7cf3bcde2caed8a7274278094a92e67030a0e5fd",
   "sha256": "5a60df24c40782369fdcd635ec2d7ea60056cd057558bb6dccb99420d329e7f7",
   "bytes": 46423
  }
 },
 {
  "path": "projects/ngx-material-legacy/styles/bridges/_form-field-state-overrides.scss",
  "before": {
   "path": "projects/ngx-material-legacy/styles/bridges/_form-field-state-overrides.scss",
   "blob_oid": "4be63d5aa05d71d32f96080c481fce30485c2cb6",
   "sha256": "c953a6c0df04dd73b443548f4872f62fa0704881590ccb508bd7db7741f391fc",
   "bytes": 975
  },
  "after": {
   "path": "projects/ngx-material-legacy/styles/bridges/_form-field-state-overrides.scss",
   "blob_oid": "c138791bbec35f674fa39260163b237a85347c00",
   "sha256": "da629f9de4d104f8645a5e55f4afbdb5b22697d68541c1a8e3e1f579f82c5042",
   "bytes": 2505
  }
 },
 {
  "path": "projects/ngx-material-legacy/styles/form-field/_form-field-theme.scss",
  "before": {
   "path": "projects/ngx-material-legacy/styles/form-field/_form-field-theme.scss",
   "blob_oid": "9a371f750e7866dbbdd3d683713a918b6afdc2a5",
   "sha256": "c9ecd831e3a2f771b82a86626875e0f4638e832c231b672e554b994d1e0dc623",
   "bytes": 5119
  },
  "after": {
   "path": "projects/ngx-material-legacy/styles/form-field/_form-field-theme.scss",
   "blob_oid": "ea6cd6f775cecb97016e3030c9c80f670645aa95",
   "sha256": "5bdb28f2eeb29e4decc288cfb53d95dd6aa77dcc4bde1265f10adf2bae951bf5",
   "bytes": 5183
  }
 },
 {
  "path": "scripts/packed-consumer-aot-smoke.mjs",
  "before": {
   "path": "scripts/packed-consumer-aot-smoke.mjs",
   "blob_oid": "160ab590cf45d22dac9b53045bef72d5ebc31aed",
   "sha256": "55e75a9d50255c7393008da3d2d4147b2db0ee50d6f9326d1b85fa967e046746",
   "bytes": 133493
  },
  "after": {
   "path": "scripts/packed-consumer-aot-smoke.mjs",
   "blob_oid": "064e2fffc4decb7b5c8837c3df7ffbff9a8ee20a",
   "sha256": "e298cc09a4cdf9899449a54bf2a9fe0e169ed8735fa3d872b978be38f6d93ea0",
   "bytes": 133599
  }
 }
];

// Exact optional workspace peer-link inventory; no dependency body is traversed.
const PEER_LINKS={
 "@angular/cdk": "../../../../node_modules/.pnpm/@angular+cdk@22.1.7_506c899cb52967ef73296071e7e2b29a/node_modules/@angular/cdk",
 "@angular/common": "../../../../node_modules/.pnpm/@angular+common@22.1.7_@angular+core@22.1.7_@angular+compiler@22.1.7_rxjs@7.8.2_zone.js@0.16.3__rxjs@7.8.2/node_modules/@angular/common",
 "@angular/core": "../../../../node_modules/.pnpm/@angular+core@22.1.7_@angular+compiler@22.1.7_rxjs@7.8.2_zone.js@0.16.3/node_modules/@angular/core",
 "@angular/forms": "../../../../node_modules/.pnpm/@angular+forms@22.1.7_@angular+common@22.1.7_@angular+core@22.1.7_@angular+compiler@22._e3e723341194c55038638507329095c3/node_modules/@angular/forms",
 "@angular/material": "../../../../node_modules/.pnpm/@angular+material@22.1.7_94bd345d55a01d565780699f5d2b5992/node_modules/@angular/material",
 "@angular/platform-browser": "../../../../node_modules/.pnpm/@angular+platform-browser@22.1.7_@angular+animations@22.1.7_@angular+core@22.1.7_@angul_7e5120d6c48c1da0983dd07357574519/node_modules/@angular/platform-browser",
 "rxjs": "../../../node_modules/.pnpm/rxjs@7.8.2/node_modules/rxjs",
 "tslib": "../../../node_modules/.pnpm/tslib@2.8.1/node_modules/tslib"
};
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const clean=ref=>({path:ref.path,sha256:ref.sha256,bytes:ref.bytes});
function safePath(path){assert.equal(typeof path,'string');assert.ok(!path.startsWith('/')&&!path.includes('\\')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'));return path;}
function exact(raw,ref){assert.ok(Buffer.isBuffer(raw));assert.equal(sha(raw),ref.sha256,ref.path);assert.equal(raw.length,ref.bytes,ref.path);}
function descriptor(value){
 assert.ok(value&&typeof value==='object'&&!types.isProxy(value)&&Object.getPrototypeOf(value)===Object.prototype);
 const fields=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(fields);assert.ok(keys.every(key=>typeof key==='string'));
 assert.deepEqual(keys.sort(),Object.hasOwn(fields,'bytes')?['bytes','path','sha256']:['path','sha256']);for(const field of Object.values(fields))assert.ok(Object.hasOwn(field,'value')&&field.enumerable);
 const ref={path:safePath(fields.path.value),sha256:fields.sha256.value,...(fields.bytes?{bytes:fields.bytes.value}:{})};assert.match(ref.sha256,/^[a-f0-9]{64}$/);if(fields.bytes)assert.ok(Number.isSafeInteger(ref.bytes)&&ref.bytes>=0);return ref;
}

export function retainedCurrentContextIdentity({root=process.cwd(),read}={}){
 root=resolve(root);const assertRoot=()=>{for(let p=root;;p=dirname(p)){const st=lstatSync(p);assert.ok(st.isDirectory()&&!st.isSymbolicLink(),'symlink or non-directory root ancestor '+p);if(dirname(p)===p)break;}};assertRoot();read??=path=>readEvidenceMember(root,path);assert.equal(typeof read,'function');
 const physical=path=>readEvidenceMember(root,safePath(path));assert.ok(physical(SELF).equals(image));
 const packetBytes=physical(PACKET.path);exact(packetBytes,PACKET);const packet=JSON.parse(packetBytes);
 assert.equal(packet.schema_version,1);assert.equal(packet.role,'finite-main-retained-current-context-identity');assert.equal(packet.base_head,BASE);
 for(const [key,value]of Object.entries({source_scope_only:true,historical_reports_rewritten:false,historical_programs_executed:false,source_judgments_requalified:false,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'}))assert.equal(packet[key],value,key);
 assert.equal(packet.current.commit,BASE);assert.equal(packet.before_contexts.length,3);assert.equal(packet.current.products.length,1120);assert.equal(packet.current.inputs.length,68);
 assert.deepEqual(packet.before_contexts.map(profile=>profile.report.path),['compatibility/rc/packed-upstream-source-build.json','compatibility/rc/packed-upstream-source-build-main-e184.json','compatibility/rc/packed-upstream-source-bazel.json']);
 assert.match(JSON.parse(physical('projects/ngx-material-legacy/package.json')).version,/^22\./);
 const env={PATH:process.env.PATH,LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0'};
 const git=(args,input)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,input,maxBuffer:128*1024*1024});
 git(['merge-base','--is-ancestor',BASE,SUCCESSOR]);git(['merge-base','--is-ancestor',SUCCESSOR,CURRENT]);git(['merge-base','--is-ancestor',CURRENT,'HEAD']);assert.equal(git(['rev-parse',CURRENT+'^{tree}']).toString().trim(),CURRENT_TREE);assert.equal(git(['rev-parse',BASE+'^{tree}']).toString().trim(),packet.current.tree);assert.equal(git(['rev-parse',SUCCESSOR+'^{tree}']).toString().trim(),SUCCESSOR_TREE);
 const bound=new Map(),identities=new Map(),current=new Map(),retired=new Set();
 const add=ref=>{safePath(ref.path);const normalized=clean(ref),prior=bound.get(ref.path);if(prior)assert.deepEqual(prior,normalized);else bound.set(ref.path,normalized);};
 const identity=ref=>{const normalized=clean(ref),rows=identities.get(ref.path)??new Map(),prior=rows.get(ref.sha256);if(prior)assert.deepEqual(prior,normalized);else rows.set(ref.sha256,normalized);identities.set(ref.path,rows);};
 const member=ref=>{const raw=physical(ref.path);exact(raw,ref);const supplied=read(ref.path);assert.ok(Buffer.isBuffer(supplied)&&raw.equals(supplied),'nonphysical retained context '+ref.path);assert.ok(raw.equals(physical(ref.path)),'retained context changed during callback '+ref.path);return raw;};
 add({path:SELF,sha256:sha(image),bytes:image.length});add(PACKET);
 // Git bodies below are authenticated as data only. No before-image program is
 // imported, evaluated, written into the checkout, or exposed as a current read.
 const verifyGit=(commit,refs,ancestorLimit=BASE)=>{
  assert.match(commit,/^[a-f0-9]{40}$/);git(['merge-base','--is-ancestor',commit,ancestorLimit]);
  const raw=git(['cat-file','--batch'],Buffer.from(refs.map(ref=>commit+':'+safePath(ref.path)+'\n').join('')));let offset=0;
  for(const ref of refs){const end=raw.indexOf(10,offset);assert.ok(end>=offset);const header=raw.subarray(offset,end).toString().split(' ');offset=end+1;assert.equal(header.length,3);assert.equal(header[0],ref.blob_oid);assert.equal(header[1],'blob');assert.match(header[2],/^\d+$/);const size=Number(header[2]);assert.ok(Number.isSafeInteger(size)&&size>=0&&offset+size<raw.length);const body=raw.subarray(offset,offset+size);exact(body,ref);offset+=size;assert.equal(raw[offset++],10);}
  assert.equal(offset,raw.length);
 };
 const oldProducts=packet.current.products,oldInputs=packet.current.inputs;
 const oldProductPaths=oldProducts.map(ref=>ref.path);assert.deepEqual(oldProductPaths,[...new Set(oldProductPaths)].sort());assert.ok(oldProductPaths.every(path=>path.startsWith('projects/ngx-material-legacy/')));
 assert.deepEqual(git(['ls-tree','-r','--name-only',BASE,'--','projects/ngx-material-legacy']).toString().trim().split('\n'),oldProductPaths);
 verifyGit(BASE,[...oldProducts,...oldInputs]);
 const oldByPath=new Map([...oldProducts,...oldInputs].map(ref=>[ref.path,ref]));assert.equal(oldByPath.size,1188);
 const deltaByPath=new Map();for(const row of DELTA){assert.ok(!deltaByPath.has(row.path));assert.equal(row.after.path,row.path);const old=oldByPath.get(row.path);if(row.before){assert.deepEqual(old,row.before);}else assert.equal(old,undefined);deltaByPath.set(row.path,row);}
 assert.equal(deltaByPath.size,6);
 const changes=git(['diff','--name-status','--no-renames',BASE,SUCCESSOR,'--','projects/ngx-material-legacy',...oldInputs.map(ref=>ref.path)]).toString().trim().split('\n');
 assert.deepEqual(changes,DELTA.map(row=>(row.before?'M':'A')+'\t'+row.path));
 const intermediateProducts=oldProducts.map(ref=>deltaByPath.get(ref.path)?.after??ref).concat(DELTA.filter(row=>!row.before&&row.path.startsWith('projects/ngx-material-legacy/')).map(row=>row.after)).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 const intermediateInputs=oldInputs.map(ref=>deltaByPath.get(ref.path)?.after??ref);assert.equal(intermediateProducts.length,1121);assert.equal(intermediateInputs.length,68);
 const intermediate=[...intermediateProducts,...intermediateInputs],intermediateByPath=new Map(intermediate.map(ref=>[ref.path,ref]));
 const continuation=new Map();for(const row of CURRENT_DELTA){assert.ok(!continuation.has(row.path));assert.deepEqual(intermediateByPath.get(row.path),row.before);assert.equal(row.after.path,row.path);continuation.set(row.path,row);}
 assert.equal(continuation.size,38);
 assert.deepEqual(git(['diff','--name-status','--no-renames',SUCCESSOR,CURRENT,'--','projects/ngx-material-legacy',...oldInputs.map(ref=>ref.path)]).toString().trim().split('\n'),CURRENT_DELTA.map(row=>'M\t'+row.path));
 const products=intermediateProducts.map(ref=>continuation.get(ref.path)?.after??ref),inputs=intermediateInputs.map(ref=>continuation.get(ref.path)?.after??ref);
 verifyGit(SUCCESSOR,intermediate,SUCCESSOR);verifyGit(CURRENT,[...products,...inputs],CURRENT);
 for(const ref of intermediate)identity(ref);
 const productPaths=products.map(ref=>ref.path);assert.deepEqual(productPaths,[...new Set(productPaths)].sort());assert.deepEqual(git(['ls-tree','-r','--name-only',CURRENT,'--','projects/ngx-material-legacy']).toString().trim().split('\n'),productPaths);
 // The original 1120/68 frame remains authenticated history, never a current physical read.
 for(const ref of [...oldProducts,...oldInputs])identity(ref);
 for(const ref of [...products,...inputs]){assert.ok(!current.has(ref.path));current.set(ref.path,clean(ref));identity(ref);add(ref);}

 for(const profile of packet.before_contexts){
  add(profile.report);const report=JSON.parse(member(profile.report)),context=report.candidate_context;
  assert.equal(sha(JSON.stringify(context)),profile.context_sha256);assert.deepEqual(context.product_members,profile.products.map(clean));
  assert.deepEqual([...context.files,...(report.additional_graph_context?.files??[])],profile.inputs.map(clean));
  verifyGit(profile.product_commit,profile.products);verifyGit(profile.input_commit,profile.inputs);
  for(const ref of [...profile.products,...profile.inputs])identity(ref);
  const old=profile.products.map(ref=>ref.path),missing=old.filter(path=>!current.has(path)).sort(),added=oldProductPaths.filter(path=>!old.includes(path));
  assert.deepEqual(missing,profile.retired_paths);assert.equal(missing.length,23);assert.ok(missing.every(path=>path.endsWith('/internal/common-module.ts')));missing.forEach(path=>retired.add(path));
  assert.deepEqual(added,profile.added_paths);assert.ok(added.length===0||added.length===1&&added[0]==='projects/ngx-material-legacy/legacy-tabs/tab-body-reversal.spec.ts');
 }
 const assertMembership=()=>{
  const base='projects/ngx-material-legacy',directories=new Set([base]);
  for(const path of productPaths){let parent=dirname(path);while(parent.startsWith(base+'/')){directories.add(parent);parent=dirname(parent);}}
  const peerPath=base+'/node_modules';
  const peers=()=>{const dir=resolve(root,peerPath),st=lstatSync(dir);assert.ok(st.isDirectory()&&!st.isSymbolicLink(),'invalid peer directory');assert.deepEqual(readdirSync(dir).sort(),['@angular','rxjs','tslib']);const scope=join(dir,'@angular'),scopeStat=lstatSync(scope);assert.ok(scopeStat.isDirectory()&&!scopeStat.isSymbolicLink(),'invalid peer scope');assert.deepEqual(readdirSync(scope).sort(),['cdk','common','core','forms','material','platform-browser']);for(const [path,target] of Object.entries(PEER_LINKS)){const full=join(dir,path);assert.ok(lstatSync(full).isSymbolicLink(),'invalid peer link '+path);assert.equal(readlinkSync(full),target,'changed peer link '+path);}};
  const paths=[];const walk=relative=>{const full=resolve(root,relative),st=lstatSync(full);assert.ok(!st.isSymbolicLink(),'symlink in product tree '+relative);if(st.isDirectory()){assert.ok(directories.has(relative),'unexpected product directory '+relative);for(const name of readdirSync(full).sort()){const child=relative+'/'+name;if(child===peerPath){peers();continue;}walk(child);}return;}assert.ok(st.isFile(),'invalid product member '+relative);paths.push(relative);};
  walk(base);assert.deepEqual(paths.sort(),productPaths,'changed current physical product membership');
  for(const path of retired){let exists=true;try{lstatSync(resolve(root,path));}catch(error){if(error.code==='ENOENT')exists=false;else throw error;}assert.equal(exists,false,'retired source reintroduced '+path);}
 };
 let verifying=false,reentered=false;
 const assertCurrent=()=>{
  if(verifying){reentered=true;throw new Error('retained context reentry');}
  verifying=true;reentered=false;try{
  assertRoot();assert.ok(physical(SELF).equals(image));assertMembership();
  for(const ref of bound.values())member(ref);
  // The last callback can change an earlier member. Close the observation with
  // a complete physical sweep that invokes no caller-provided code.
  for(const ref of bound.values())exact(physical(ref.path),ref);
  assertMembership();assert.ok(physical(SELF).equals(image));assertRoot();assert.equal(reentered,false,'retained context reentry');
  }finally{verifying=false;}
 };
 const resolveReference=value=>{
  const ref=descriptor(value),rows=identities.get(ref.path);if(!rows)return null;const known=rows.get(ref.sha256);assert.ok(known,'unknown retained context identity '+ref.path);if(ref.bytes!==undefined)assert.equal(ref.bytes,known.bytes);
  const selected=current.get(ref.path);return selected?{kind:'current',reference:{...selected}}:{kind:'retired',historical:{...known}};
 };
 assertCurrent();
 return Object.freeze({
  get bound(){return structuredClone([...bound.values()]);},
  get products(){return structuredClone(products.map(clean));},
  get inputs(){return structuredClone(inputs.map(clean));},
  get beforeContexts(){return structuredClone(packet.before_contexts.map(profile=>({report:profile.report,products:profile.products.map(clean),inputs:profile.inputs.map(clean),retired_paths:profile.retired_paths,added_paths:profile.added_paths})));},
  // Pure finite descriptor lookup. A caller must bracket consumption with the
  // physical guard and compare fresh reads. This returns no read capability.
  resolveReference,assertCurrent,current_source_admission_granted:false,source_judgments_requalified:false,current_source_reader_returned:false,g11_claim:'not-passed',
 });
}
