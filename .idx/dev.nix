# To learn more about how to use Nix to configure your environment
# see: https://firebase.google.com/docs/studio/customize-workspace
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-24.05"; # or "unstable"

  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.docker                 # Docker CLI client
    pkgs.docker-compose         # Docker Compose (often used with Docker)
    pkgs.google-cloud-sdk     # Google Cloud SDK (for gcloud, auth, etc.)
    pkgs.nodejs_20              # Node.js v20 (matches package.json)
    pkgs.python311              # Python 3.11 (matches pyproject.toml)
    pkgs.python311Packages.pip  # Pip (needed by some tools, uv is primary)
    pkgs.uv                     # uv Python package installer/manager
  ];

  # Sets environment variables in the workspace
  env = {};

  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      "ms-azuretools.vscode-docker" # Standard Docker extension
      # Consider adding Google Cloud Code extension for better GCP/Firebase integration
      # "googlecloudtools.cloudcode" 
    ];

    # Enable previews
    previews = {
      enable = true;
      previews = {
        # Example preview configuration (adjust as needed)
        # web = {
        #   command = ["npm", "run", "dev"];
        #   manager = "web";
        #   env = { PORT = "$PORT"; };
        # };
      };
    };

    # Workspace lifecycle hooks
    workspace = {
      # Runs when a workspace is first created
      onCreate = {
        # Install Node.js dependencies
        npm-install = "npm install";
        # Install Python dependencies using uv and the lock file
        python-deps = "uv pip sync --system"; 
        # Open relevant files by default
        default.openFiles = [ ".idx/dev.nix" "README.md" "server/firebase.ts" "Dockerfile" ];
      };

      # Runs when the workspace is (re)started
      onStart = {
        # Try to configure Docker authentication for GCR using gcloud.
        # Requires gcloud to be logged in (IDX might handle this automatically).
        # The -q flag suppresses prompts if already configured.
        docker-auth-gcr = "gcloud auth configure-docker gcr.io -q";
        # Check docker status immediately after attempting auth configuration
        check-docker-status = "docker ps";
      };
    };
  };
}
