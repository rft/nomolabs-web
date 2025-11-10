{
  description = "nomolabs Nix flake with Node.js";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };
      in
      {
        packages.default = pkgs.nodejs_20;

        packages.nomolabs-app = pkgs.buildNpmPackage {
          pname = "nomolabs";
          version = "0.0.1";
          src = pkgs.lib.cleanSourceWith {
            src = ./nomolabs-web;
            filter = pkgs.lib.cleanSourceFilter;
          };
          npmDepsHash = "";
          # npmDepsHash = pkgs.lib.fakeSha256;
          npmBuildScript = "build";
          installPhase = ''
            runHook preInstall
            mkdir -p $out
            cp -r build $out/
            cp package.json package-lock.json $out/
            cp -r node_modules $out/
            runHook postInstall
          '';
        };

        packages.dockerImage = pkgs.dockerTools.buildImage {
          name = "nomolabs";
          tag = "latest";
          copyToRoot = pkgs.buildEnv {
            name = "nomolabs-root";
            paths = [
              (pkgs.runCommand "app" { } ''
                mkdir -p $out
                cp -r ${self.packages.${system}.nomolabs-app} $out/app
              '')
              pkgs.nodejs_20
              pkgs.bashInteractive
              pkgs.coreutils
            ];
          };
          config = {
            WorkingDir = "/app";
            Env = [
              "NODE_ENV=production"
              "HOST=0.0.0.0"
              "PORT=3000"
              "PATH=/bin"
            ];
            ExposedPorts = {
              "3000/tcp" = { };
            };
            Cmd = [
              "node"
              "build/index.js"
            ];
          };
        };

        devShells.default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_20
            pkgs.nodePackages_latest.pnpm
          ];
        };
      }
    );
}
