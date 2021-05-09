FROM debian:stable-slim
MAINTAINER mickael@kerjean.me

ENV PUBLIC_KEY="-----BEGIN PGP PUBLIC KEY BLOCK-----\\n\\n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\\n=RQu+\\n-----END PGP PUBLIC KEY BLOCK-----\\n"
ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update > /dev/null && \
    #################
    # Install
    apt-get install -y libglib2.0-0 curl gnupg > /dev/null && \
    echo $PUBLIC_KEY | gpg --import && \
    cd /tmp/ && \
    curl --resolve downloads.filestash.app -s https://downloads.filestash.app/latest/filestash_`uname -s`-`uname -m`.tar.gpg | gpg --decrypt | tar xf - && \
    mv filestash /app/ && \
    apt-get purge -y --auto-remove gnupg && \
    #################
    # Optional dependencies
    apt-get install -y curl tor emacs ffmpeg zip poppler-utils > /dev/null && \
    # org-mode: html export
    curl https://raw.githubusercontent.com/mickael-kerjean/filestash/master/server/.assets/emacs/htmlize.el > /usr/share/emacs/site-lisp/htmlize.el && \
    # org-mode: markdown export
    curl https://raw.githubusercontent.com/mickael-kerjean/filestash/master/server/.assets/emacs/ox-gfm.el > /usr/share/emacs/site-lisp/ox-gfm.el && \
    # org-mode: pdf export (with a light latex distribution)
    cd && apt-get install -y wget perl > /dev/null && \
    export CTAN_REPO="http://mirror.las.iastate.edu/tex-archive/systems/texlive/tlnet" && \
    curl -sL "https://yihui.name/gh/tinytex/tools/install-unx.sh" | sh && \
    mv ~/.TinyTeX /usr/share/tinytex && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install wasy && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install ulem && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install marvosym && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install wasysym && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install xcolor && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install listings && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install parskip && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install float && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install wrapfig && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install sectsty && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install capt-of && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install epstopdf-pkg && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install cm-super && \
    ln -s /usr/share/tinytex/bin/x86_64-linux/pdflatex /usr/local/bin/pdflatex && \
    apt-get purge -y --auto-remove perl wget && \
    # Cleanup
    find /usr/share/ -name 'doc' | xargs rm -rf && \
    find /usr/share/emacs -name '*.pbm' | xargs rm -f && \
    find /usr/share/emacs -name '*.png' | xargs rm -f && \
    find /usr/share/emacs -name '*.xpm' | xargs rm -f && \
    #################
    # Finalise the image
    useradd filestash && \
    chown -R filestash:filestash /app/ && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /tmp/*

USER filestash
RUN timeout 1 /app/filestash | grep -q start

EXPOSE 8334
VOLUME ["/app/data/state/"]
WORKDIR "/app"
CMD ["/app/filestash"]