import requests

URL_BASE = "https://pokeapi.co/api/v2/"

def get_pokemon(nombre):
    url = f"{URL_BASE}pokemon/{nombre.lower()}"
    response = requests.get(url)

    if response.status_code == 200: #Nuestra petición es exitosa
        return response.json()
    else:
        print("Error: Pokémon no encontrado")
        return None #Salimos de la función


if __name__ == "__main__":
    print("Consultor Pokémon...")
    nombre = input("Ingresa el nombre de un Pokémon: ").strip() #Elimina espacios.Como Trim en Java

    if (datos := get_pokemon(nombre)): #Si no hay error en la funcion
        print(f"\nNombre: {datos['name'].capitalize()}")
        print(f"Altura: {datos['height'] /10} metros") 
        print(f"Peso: {datos['weight'] /10} kg") 

        tipo = datos['types'][0]['type']['name']
        print(f"Tipo: {tipo.capitalize()}")

        print("\nMovimientos: ")
        for move in datos ['moves'][:5]:
            print(f"- {move['move']['name'].replace('-', ' ').title()}") #Formateamos los formatos que vienen de serie "latigo-cepa" por "Latigo Cepa"

        imagen_url = datos['sprites']['other']['official-artwork']['front_default']
        print(f"Imagen oficial: {imagen_url}")
        
else:
    print("¿Estás seguro de que este Pokémon existe?")