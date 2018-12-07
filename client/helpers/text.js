export function format(str = ""){
    if(str.length === 0) return str;
    return str.split("_")
        .map((word, index) => {

            if(index != 0) return word;
            return word[0].toUpperCase() + word.substring(1);
        })
        .join(" ");
}
