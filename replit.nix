{pkgs}: {
  deps = [
    pkgs.udev
    pkgs.alsa-lib
    pkgs.expat
    pkgs.mesa
    pkgs.libxkbcommon
    pkgs.xorg.libxcb
    pkgs.xorg.libX11
    pkgs.nspr
    pkgs.nss
    pkgs.glib
  ];
}
