/** Words too common to be interesting. English + Hinglish (romanised Hindi) + Hindi (Devanagari) + chat filler. */
const EN = `a about above after again against all also am an and any are aren't as at be because been before being below
between both but by can can't cannot could couldn't did didn't do does doesn't doing don't down during each few for from
further had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself him himself his how how's
i i'd i'll i'm i've if in into is isn't it it's its itself just let's me more most mustn't my myself no nor not of off on
once only or other ought our ours ourselves out over own same shan't she she'd she'll she's should shouldn't so some such
than that that's the their theirs them themselves then there there's these they they'd they'll they're they've this those
through to too under until up very was wasn't we we'd we'll we're we've were weren't what what's when when's where where's
which while who who's whom why why's will with won't would wouldn't you you'd you'll you're you've your yours yourself
yourselves im ive dont cant wont didnt doesnt isnt thats whats youre u ur r ya yeah yes yep ok okay k kk oh ah hmm hm um
uh got get gonna wanna gotta like one also just really now well even still much many go going know think yea na nah ill
its id hes shes theyre were wasnt arent couldnt shouldnt wouldnt aint let lets thing things way ll re ve s t d m o y`;

const HINGLISH = `hai hain ha haan han ho hu hoon hun tha thi the thy ka ki ke ko kya kyu kyun kyon kab kaise kaisa kaisi kahan
kaha kidhar idhar udhar jo jab tab toh to bhi hi na nahi nhi nai nahin mat mai main mein me mera meri mere tera teri tere
tu tum tujhe tumhe tumhara tumhari aap apna apni apne aapka aapki hum hamara hamari humara wo woh vo voh ye yeh is us iss
uss inko unko isko usko se par pe aur or ya bas sab kuch koi kaun kitna kitne kitni bahut bohot bhot bht thoda zyada
abhi ab phir fir wala wali wale waala waali kar karo karna karke kiya kiye kari kr krna krke raha rahi rahe rha rhi rhe
hua hui hue ga gi ge gya gaya gayi gyi diya dia de do dena lo le lena liya liye lia hoga hogi hoge hota hoti hote jaa ja
jao jana jaana aa aao aaja aya aaya ayi aayi sakta sakti sakte skta skte wahi yahi waha yaha vaha yaha tak liye lie ek
haa hn nd bhai yaar yr achha acha accha theek thik thk sahi karte karta karti karenge karega karungi karunga
rahe rahega rahi hoga kuchh kuch bhai log sir ji arre arey are re`;

const HINDI = `है हैं था थी थे का की के को में मैं मे से पर और या भी ही तो न ना नहीं नही क्या क्यों कब कैसे कहाँ कहां जो जब तब
यह ये वह वो इस उस इसे उसे इन उन मेरा मेरी मेरे तेरा तेरी तेरे तुम तू आप हम हमारा अपना अपनी अपने कुछ कोई सब बहुत अब
फिर कर करो करना किया हो हुआ हुई गया गई दिया लिया रहा रही रहे एक लिए तक वाला वाली वाले हाँ हां जी`;

const FILLER = `haha hahaha hahahaha lol lmao lmfao rofl xd hehe hehehe omg ohh ohk okk okkk okie ohkay hmmm hmmmm acha
media omitted image video sticker gif audio document deleted message null edited https http www com`;

export const STOPWORDS: ReadonlySet<string> = new Set(
  [EN, HINGLISH, HINDI, FILLER]
    .join(' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase()),
);

/** Laughs are fun but repetitive; collapse "hahahaha" etc. so they don't swamp the list. */
export function isLaugh(word: string): boolean {
  return /^(a?ha){2,}h?$|^(he){2,}$|^(hi){3,}$|^l+o+l+$|^lmf?a+o+$|^x+d+$|^ja(ja)+$|^ks{2,}$|^rs{2,}$/.test(word);
}
