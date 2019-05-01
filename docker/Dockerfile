FROM debian:stable-slim
MAINTAINER mickael@kerjean.me

RUN echo "deb http://debian.mirrors.ovh.net/debian stretch main" > /etc/apt/sources.list && \
    apt-get update > /dev/null && \
    #################
    # Install
    apt-get install -y libglib2.0-0 curl > /dev/null && \
    curl -s https://downloads.filestash.app/latest/filestash_linux-amd64.tar.gz > /tmp/filestash.tar.gz && \
    mkdir /app/ && \
    tar zxf /tmp/filestash.tar.gz -C /tmp/ && \
    mv /tmp/filestash/* /app/ && \
    rm -rf /tmp/filestash* && \
    #################
    # Optional dependencies
    apt-get install -y curl emacs zip poppler-utils > /dev/null&& \
    # Minimal latex dependencies for org-mode
    cd ~/ && apt-get install -y wget perl > /dev/null && \
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

EXPOSE 8334
VOLUME ["/app/data/"]
WORKDIR "/app"
USER filestash
CMD ["/app/filestash"]