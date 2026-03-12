(function(global){
  function formatTs(ms){
    return new Date(ms).toISOString().replace('T',' ').slice(0,19);
  }

  function mockGenerateId(len){
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const L = Math.max(8, Math.min(30, Number(len)||8));
    let s = '';
    for (let i=0;i<L;i++) s += chars[Math.floor(Math.random()*chars.length)];
    return s;
  }

  function buildMockEmails(count){
    const now = Date.now();
    const templates = [
      (code)=>`Your verification code is ${code}, valid for 5 minutes`,
      (code)=>`Your verification code is ${code}. It expires in 5 minutes`,
      (code)=>`One-time code: ${code}`,
      (code)=>`Security verification · code ${code}`,
      (code)=>`Login code is ${code}`,
    ];
    return Array.from({length: count||6}).map((_, i) => {
      const id = 10000 + i;
      const code = String((Math.abs((id*7919)%900000)+100000)).slice(0,6);
      return {
        id,
        sender: `demo${i}@example.com`,
        subject: templates[i%templates.length](code),
        received_at: formatTs(now - i*600000),
        is_read: i>1,
        content: `Hello, you are using demo mode. Verification code: ${code}. Please complete verification within 5 minutes.`,
        html_content: `<p>Hello, you are using <strong>demo mode</strong>.</p><p><strong>Verification code: ${code}</strong></p>`
      };
    });
  }

  function buildMockMailboxes(limit, offset, domains){
    const now = Date.now();
    const list = [];
    const size = Math.min(limit||10, 10);
    const arrDomains = Array.isArray(domains) && domains.length ? domains : ['example.com'];
    for (let i=0;i<size;i++){
      list.push({
        address: `${mockGenerateId(10)}@${arrDomains[(offset||0 + i)%arrDomains.length]}`,
        created_at: formatTs(now - (offset||0 + i)*3600000),
      });
    }
    return list;
  }

  function buildMockEmailDetail(id){
    const code = String((Math.abs((Number(id||10000)*7919)%900000)+100000)).slice(0,6);
    return {
      id: Number(id)||10000,
      sender: 'noreply@example.com',
      subject: `Demo email content (code ${code})`,
      received_at: formatTs(Date.now()),
      content: `This is demo-mode email content for UI preview only. Code: ${code}`,
      html_content: `<p><strong>Demo mode</strong>: this content is simulated data.</p><p>Code: <strong>${code}</strong></p>`
    };
  }

  global.MockData = { formatTs, mockGenerateId, buildMockEmails, buildMockMailboxes, buildMockEmailDetail };
})(typeof window !== 'undefined' ? window : this);


