{
  description = "Workspace toolchain for ngx-compat-material-legacy";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/34ab99075ac4f7e40cf037eef32cb1c360bb85e9";

  outputs = { self, nixpkgs }:
    let
      systems = [ "aarch64-linux" "x86_64-linux" ];
      forAllSystems = fn:
        nixpkgs.lib.genAttrs systems (system:
          fn (import nixpkgs { inherit system; }));
    in
    {
      devShells = forAllSystems (pkgs:
        let
          sources = builtins.fromJSON (builtins.readFile ./nix/tool-sources.json);
          nodeSource = sources.node.${pkgs.stdenv.hostPlatform.system};
          pnpmSource = sources.pnpm.${pkgs.stdenv.hostPlatform.system};
          node = pkgs.stdenvNoCC.mkDerivation {
            pname = "nodejs";
            version = sources.node.version;
            src = pkgs.fetchurl {
              url = nodeSource.url;
              hash = nodeSource.hash;
            };
            nativeBuildInputs = [ pkgs.xz pkgs.gnutar ];
            dontUnpack = true;
            dontConfigure = true;
            dontBuild = true;
            dontFixup = true;
            installPhase = ''
              mkdir -p $out
              tar -xJf $src -C $out --strip-components=1
            '';
          };
          pnpm = pkgs.stdenvNoCC.mkDerivation {
            pname = "pnpm";
            version = sources.pnpm.version;
            src = pkgs.fetchurl {
              url = pnpmSource.url;
              hash = pnpmSource.hash;
            };
            nativeBuildInputs = [ pkgs.gzip pkgs.gnutar ];
            dontUnpack = true;
            dontConfigure = true;
            dontBuild = true;
            dontFixup = true;
            installPhase = ''
              mkdir -p $out/bin
              tar -xzf $src -C $out/bin --strip-components=1 package/pnpm
              chmod +x $out/bin/pnpm
            '';
          };
        in
        {
          default = pkgs.mkShell {
            name = "ngx-compat-material-legacy";
            NIX_NO_SELF_RPATH = "1";
            packages = [
              node
              pnpm
              pkgs.python3
              pkgs.git
              pkgs.bash
              pkgs.coreutils
              pkgs.findutils
              pkgs.gnugrep
              pkgs.gnused
              pkgs.gawk
              pkgs.curl
              pkgs.cacert
              pkgs.which
            ];
            shellHook = ''
              export PNPM_HOME="$PWD/.cache/pnpm/bin"
              export PNPM_STORE_DIR="''${PNPM_STORE_DIR:-$PWD/.cache/pnpm/store}"
              mkdir -p "$PNPM_HOME" "$PNPM_STORE_DIR"
              export npm_config_store_dir="$PNPM_STORE_DIR"
              export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
              export PATH="${node}/bin:${pnpm}/bin:$PNPM_HOME:$PWD/node_modules/.bin:$PATH"
            '';
          };
        });
    };
}
