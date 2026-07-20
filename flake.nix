{
  description = "Frontal JavaScript/TypeScript SDK Monorepo";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    bun.url = "github:oven-sh/bun";
  };

  outputs = { self, nixpkgs, flake-utils, bun }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        bun-pkg = bun.packages.${system}.bun;

        # Development dependencies
        devDeps = with pkgs; [
          nodejs_20
          bun-pkg
          git
          biome
          typescript
        ];

        # Shell environment
        devShell = pkgs.mkShell {
          buildInputs = devDeps;

          shellHook = ''
            echo "[START] Frontal SDK Development Environment"
            echo "Node: $(node --version)"
            echo "Bun: $(bun --version)"
            echo "TypeScript: $(tsc --version)"
            echo ""
            echo "Available commands:"
            echo "  bun run build     - Build all packages"
            echo "  bun run test      - Run tests"
            echo "  bun run lint      - Lint code"
            echo "  bun run format    - Format code"
            echo "  bun run changeset - Add changeset"
            echo "  bun run bench      - Run benchmarks"
          '';
        };

        # Package individual SDK components
        packagePackages = {
          ai = pkgs.stdenv.mkDerivation {
            pname = "@frontal/ai";
            version = "0.0.0";
            src = ./packages/ai;
            nativeBuildInputs = [ bun-pkg ];
            buildPhase = ''
              bun install --frozen-lockfile
              bun run build
            '';
            installPhase = ''
              mkdir -p $out
              cp -r packages/ai/dist $out/
            '';
          };

          functions = pkgs.stdenv.mkDerivation {
            pname = "@frontal/functions";
            version = "0.0.0";
            src = ./packages/workers;
            nativeBuildInputs = [ bun-pkg ];
            buildPhase = ''
              bun install --frozen-lockfile
              bun run build
            '';
            installPhase = ''
              mkdir -p $out
              cp -r packages/workers/dist $out/
            '';
          };

          storage = pkgs.stdenv.mkDerivation {
            pname = "@frontal/storage";
            version = "0.0.0";
            src = ./packages/storage;
            nativeBuildInputs = [ bun-pkg ];
            buildPhase = ''
              bun install --frozen-lockfile
              bun run build
            '';
            installPhase = ''
              mkdir -p $out
              cp -r packages/storage/dist $out/
            '';
          };

          agents = pkgs.stdenv.mkDerivation {
            pname = "@frontal/agents";
            version = "0.0.0";
            src = ./packages/agents;
            nativeBuildInputs = [ bun-pkg ];
            buildPhase = ''
              bun install --frozen-lockfile
              bun run build
            '';
            installPhase = ''
              mkdir -p $out
              cp -r packages/agents/dist $out/
            '';
          };

          core = pkgs.stdenv.mkDerivation {
            pname = "@frontal/core";
            version = "0.0.0";
            src = ./packages/core;
            nativeBuildInputs = [ bun-pkg ];
            buildPhase = ''
              bun install --frozen-lockfile
              bun run build
            '';
            installPhase = ''
              mkdir -p $out
              cp -r packages/core/dist $out/
            '';
          };

          graph = pkgs.stdenv.mkDerivation {
            pname = "@frontal/graph";
            version = "0.0.0";
            src = ./packages/graph;
            nativeBuildInputs = [ bun-pkg ];
            buildPhase = ''
              bun install --frozen-lockfile
              bun run build
            '';
            installPhase = ''
              mkdir -p $out
              cp -r packages/graph/dist $out/
            '';
          };

          models = pkgs.stdenv.mkDerivation {
            pname = "@frontal/ontology";
            version = "0.0.0";
            src = ./packages/ontology;
            nativeBuildInputs = [ bun-pkg ];
            buildPhase = ''
              bun install --frozen-lockfile
              bun run build
            '';
            installPhase = ''
              mkdir -p $out
              cp -r packages/ontology/dist $out/
            '';
          };

          pipelines = pkgs.stdenv.mkDerivation {
            pname = "@frontal/pipelines";
            version = "0.0.0";
            src = ./packages/pipelines;
            nativeBuildInputs = [ bun-pkg ];
            buildPhase = ''
              bun install --frozen-lockfile
              bun run build
            '';
            installPhase = ''
              mkdir -p $out
              cp -r packages/pipelines/dist $out/
            '';
          };

          testing = pkgs.stdenv.mkDerivation {
            pname = "@frontal/testing";
            version = "0.0.0";
            src = ./packages/testing;
            nativeBuildInputs = [ bun-pkg ];
            buildPhase = ''
              bun install --frozen-lockfile
              bun run build
            '';
            installPhase = ''
              mkdir -p $out
              cp -r packages/testing/dist $out/
            '';
          };

          workflows = pkgs.stdenv.mkDerivation {
            pname = "@frontal/workflows";
            version = "0.0.0";
            src = ./packages/workflows;
            nativeBuildInputs = [ bun-pkg ];
            buildPhase = ''
              bun install --frozen-lockfile
              bun run build
            '';
            installPhase = ''
              mkdir -p $out
              cp -r packages/workflows/dist $out/
            '';
          };
        };

        # Benchmark suite
        benchmarks = pkgs.stdenv.mkDerivation {
            pname = "frontal-cloud-benchmarks";
            version = "0.0.0";
            src = ./benchmarks;
            nativeBuildInputs = [ bun-pkg ];
            buildPhase = ''
              bun install --frozen-lockfile
              bun run build
            '';
            installPhase = ''
              mkdir -p $out
              cp -r benchmarks/dist $out/
              cp benchmarks/run.js $out/
              cp benchmarks/package.json $out/
            '';
          };

        # Documentation generation
        docs = pkgs.stdenv.mkDerivation {
            pname = "frontal-cloud-docs";
            version = "0.0.0";
            src = ./docs;
            buildInputs = [ pkgs.nodejs_20 ];
            buildPhase = ''
              echo "Generating documentation..."
              # Add documentation generation commands here
            '';
            installPhase = ''
              mkdir -p $out
              cp -r docs/* $out/
            '';
          };
      in
      {
        devShells.default = devShell;

        # Package the SDK
        packages = {
          default = pkgs.stdenv.mkDerivation {
            pname = "frontal-cloud-sdk";
            version = "0.0.0";
            src = ./.;

            nativeBuildInputs = with pkgs; [ bun-pkg ];

            buildPhase = ''
              bun install --frozen-lockfile
              bun run build
            '';

            installPhase = ''
              mkdir -p $out
              cp -r packages/*/dist $out/
            '';
          };

          inherit packagePackages benchmarks docs;
        };
      });
}
