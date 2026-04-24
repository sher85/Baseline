# Changelog

## [0.2.4](https://github.com/sher85/Baseline/compare/v0.2.3...v0.2.4) (2026-04-24)


### Bug Fixes

* standardize Baseline API on port 3001 and align env/config wiring ([bf79eb5](https://github.com/sher85/Baseline/commit/bf79eb51e29504a357c88a975e971de854254376))

## [0.2.3](https://github.com/sher85/Baseline/compare/v0.2.2...v0.2.3) (2026-04-24)


### Bug Fixes

* now pushes to baseline in shared repo ([d5eeda6](https://github.com/sher85/Baseline/commit/d5eeda6f27d5ab5cafad044a680e59f88a1ad242))

## [0.2.2](https://github.com/sher85/Baseline/compare/v0.2.1...v0.2.2) (2026-03-15)


### Bug Fixes

* add rate limiting to Oura integration auth endpoints ([b016447](https://github.com/sher85/Baseline/commit/b016447e811c4df898818ef274b0b471834215b4))

## [0.2.1](https://github.com/sher85/Baseline/compare/v0.2.0...v0.2.1) (2026-03-15)


### Bug Fixes

* complete Prisma 7, Next 16, and Recharts 3 upgrade migration ([b453ae5](https://github.com/sher85/Baseline/commit/b453ae5f8615db47a0474976efa281b5d9794ebf))
* make Prisma use the shared API env loader at runtime ([6458d3d](https://github.com/sher85/Baseline/commit/6458d3dd8b8e467e13cb217d4bf96813253610da))

## [0.2.0](https://github.com/sher85/Baseline/compare/v0.1.0...v0.2.0) (2026-03-15)


### Features

* add AI-facing analytics summary endpoints ([ae9c14c](https://github.com/sher85/Baseline/commit/ae9c14cd388030a7d4228c92452677f21db004bb))
* add anomaly heatmap, refine dashboard UX, and fix overview summary alignment ([7b47b26](https://github.com/sher85/Baseline/commit/7b47b26f794c5f15ffbd7d5506184fc58b1533f5))
* add baseline, recovery, and anomaly analytics endpoints ([0481b3c](https://github.com/sher85/Baseline/commit/0481b3cb45de7d6e21bf3b36be6ffb8fb41bce68))
* add live overview endpoint and connect dashboard homepage ([c7b2b06](https://github.com/sher85/Baseline/commit/c7b2b06af15d0710beba88e9f703faf85f4ffb4d))
* add live sleep and recovery pages with trend analytics ([fc6a162](https://github.com/sher85/Baseline/commit/fc6a1623e82a7c1f36d28c807b2e934be92f502a))
* add manual Oura sync and sync status endpoints ([91d86f9](https://github.com/sher85/Baseline/commit/91d86f94fab0168b23318b980523088d0a8eeb97))
* add Oura backfill flow and bedtime consistency visuals ([64c9d74](https://github.com/sher85/Baseline/commit/64c9d74bb12ea26023cbb29df6d37ea7afaf4804))
* add Oura integration status and OAuth groundwork ([da1c2bc](https://github.com/sher85/Baseline/commit/da1c2bcaf11d75e656e677a7ec442f452153b3e4))
* add scheduled Oura sync job orchestration ([37e98e0](https://github.com/sher85/Baseline/commit/37e98e00323f98c1dcf9a00fca7d5f42a72fee9c))
* add trends and anomalies dashboard pages ([2278d22](https://github.com/sher85/Baseline/commit/2278d229982f969e22dd5b1efb4bade274bb3587))
* complete Oura OAuth connection flow ([5dcccd6](https://github.com/sher85/Baseline/commit/5dcccd6f135f2f9ea8ad6189004b8752f6eee305))
* handle expired Oura auth gracefully and require reconnect ([24a4083](https://github.com/sher85/Baseline/commit/24a4083a20b0d3267e3aa59176a26e687537a87c))
* polish dashboard states and fallback experiences ([352f8da](https://github.com/sher85/Baseline/commit/352f8da2a1f5856bd813a3b1093472289fcc8bb6))
* scaffold wearable analytics monorepo foundation ([6270652](https://github.com/sher85/Baseline/commit/62706523de4a673e0f7d0688c5898631ce5e67e3))


### Bug Fixes

* stabilize CI tests and add release-please token fallback ([6d0879d](https://github.com/sher85/Baseline/commit/6d0879d5646a70c616aa84ae2fb21231b4564b6b))
