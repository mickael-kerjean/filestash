FROM debian:stable-slim
MAINTAINER mickael@kerjean.me

ENV PUBLIC_KEY="-----BEGIN PGP PUBLIC KEY BLOCK-----\\n\\nmQENBFzLpYEBCADOOzgckQCQRrPrq15awP5Xj3BCytNjAXDixISR3Oyq0TP9PD3z\\nAp6zwOd5B4NpwCk2vQdOaq3qRKcMGFUEDNElL9WkzBixSyqj1GNCTrtJCNtJQ3TX\\nuKebrJ1DRs1vjO/tSFMgzlF843gwgy926vVdhJKRZ+13ZrWGbbWq2wilRCYXYTkw\\n+2niWXJCe22bpofAoNmNkHGmMsImCpB/P6sE803iJgTkKgU8uzZxQdeH39LaL7Ha\\nZ8aPisOO6oc5aEQ9Lx31K5cyC+373nGq56Jh0qpJjJnuT6jeHt4uYcF/OnExUf94\\nmPwv0+5kEgIfaq8qY2nwwMX9ZIqjARcS0ufVABEBAAG0JE1pY2thZWwgS2VyamVh\\nbiA8bWlja2FlbEBrZXJqZWFuLm1lPokBVAQTAQgAPhYhBHPmP6wrA9RH5bNj1lF0\\n5OJyO2PrBQJcy6WBAhsDBQkDwmcABQsJCAcCBhUKCQgLAgQWAgMBAh4BAheAAAoJ\\nEFF05OJyO2PrnQUH/0+CV+4EiOlEYR2mFPCvJ44nt7r500wUaE9ifkdnG1cUnJY7\\n/kX7ZmSXH0atplklHTl+HjPf2l95gz1dDXhk1uZ63fcguJqk38De22wSMFqgLiBp\\nj+1JcvJs+41afX7xry6GABPP3YYJTa6xtUAS3TloG7CVUCoLHmh7TNI7+KqOYLTQ\\nw6qTN5oA5Bq108O0To2V5OmzvSVohF6GN0RwOzibaP+bsbOZt0UNPyTrjbEbbHYM\\nFL8eO3uR2quMLvZiz6asBmLBAvdvf5AtOgrWfa1krobEZOGcZtgNRJ6EumHLzESF\\n/d0AEB0CdB3jfIfusLLj499gJXJ/o2GrGx/zFvO5AQ0EXMulgQEIALMfHawDbtNP\\nNn50E4E1pkWb4Rfdyr3mLWjRmqmCzWud+XwD3biu1g/fFaH4/d51SvVSg8M26bdF\\n0wTzw/fJZBCFICWkZgsdVa59aY8IstEVmQAOw5xUW2jItr2MKgmRUQ5Y50Hj64DG\\nyH9tn8L1W7Mf6+IzU6hhtaDm13TR7w1kfldWxrUrWTJ12Krd8WAOJN8Dg97bwxID\\ncrfrT2OMTGM9hnV63hIOme/ho5KvNTn3NuOmbbRAY/bjnoDFINTBg1DXddR0AkcJ\\nnXsN/lQbjvfIAOW3uk53HcZBk2aKc0tEx3IcS8z8shSutr5cV/pM1muyzEc7QlYF\\nLcH7GhQFyykAEQEAAYkBPAQYAQgAJhYhBHPmP6wrA9RH5bNj1lF05OJyO2PrBQJc\\ny6WBAhsMBQkDwmcAAAoJEFF05OJyO2PrmVAH/AvR0JJQlrWoFjz9tJkM5tzqtV2x\\nl7mufKwldP2xAAFVg4mLZpEyeIhLAmaYgvdNg0IbOUCKm2BZHKVLPzHFchPV+L05\\nzLYtI8lRfbuXjHQnMhWzorUdHGsi01cFPhnelRUkk+eCwopcdvIKQZBP3f+YAefj\\ntqH0aeggcEp5EpgDs99gE4fwymcKd1XgcfQO/p36Pp7N2pWPpVEJlCqFQ6QwlXCr\\n4zGTPqs+1dj94kg9948z/YUtxevSSmFwGpVFtz6rMp2xwjzKDFLSntZwWAnL/cNR\\nLahn9jFK+fiLn435EF4hMU3jk+0+PcXPeptfwPqPgoJLG4hG0O+IOIbRD78=\\n=XPwb\\n-----END PGP PUBLIC KEY BLOCK-----\\n"
ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update > /dev/null && \
    #################
    # Install
    apt-get install -y libglib2.0-0 curl gnupg > /dev/null && \
    echo $PUBLIC_KEY | gpg --import && \
    cd /tmp/ && \
    curl --resolve downloads.filestash.app:443:94.23.200.66 -s https://downloads.filestash.app/latest/filestash_`uname -s`-`uname -m`.tar.gpg | gpg --decrypt | tar xf - && \
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
VOLUME ["/app/data/"]
WORKDIR "/app"
CMD ["/app/filestash"]