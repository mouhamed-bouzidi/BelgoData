import requests
from bs4 import BeautifulSoup
import re
from urllib.parse import urlparse

def deep_scraping_prospect(url_site: str) -> dict:
    """
    Scrape la page d'accueil d'un prospect belge pour extraire 
    automatiquement les e-mails et numéros de téléphone.
    """
    if not url_site:
        return {"email": None, "phone": None}
        
    # S'assurer que l'URL commence par http/https
    if not url_site.startswith(("http://", "https://")):
        url_site = "https://" + url_site

    try:
        # Configuration des headers pour ne pas être bloqué (simulation d'un navigateur standard)
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        response = requests.get(url_site, headers=headers, timeout=7)
        if response.status_code != 200:
            return {"email": None, "phone": None}
            
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 1. Extraction du texte brut de la page
        texte_page = soup.get_text()
        
        # 2. Recherche des e-mails (Regex robuste)
        email_pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
        liste_emails = re.findall(email_pattern, texte_page)
        
        # 3. Recherche des numéros de téléphone belges (GSM et Fixes)
        # Gère les formats : +32..., 02/..., 0495..., 081 ..., etc.
        phone_pattern = r"(?:\+32|0)[1-9](?:[ _.-]?\d{2}){3,4}|(?:\+32|0)4\d{2}(?:[ _.-]?\d{2}){3}"
        liste_phones = re.findall(phone_pattern, texte_page)
        
        # Épuration des résultats (doublons et formats bizarres)
        email_final = list(set(liste_emails))[0] if liste_emails else None
        phone_final = list(set(liste_phones))[0] if liste_phones else None
        
        # Nettoyage rapide du numéro si trouvé
        if phone_final:
            phone_final = phone_final.strip().replace(" ", "")

        return {
            "email": email_final,
            "phone": phone_final
        }

    except Exception as e:
        print(f"Erreur lors du deep scraping de {url_site} : {e}")
        return {"email": None, "phone": None}