import requests
import getpass
import sys
import json

BASE_URL = "http://127.0.0.1:8000"

def interactive_tutor():
    print("=== AI Tutor Interactive CLI ===")
    
    # 1. Credentials Input
    username = input("Username: ")
    password = getpass.getpass("Password: ")

    # 2. Login & Verification
    print(f"[*] Verifying credentials for '{username}'...")
    login_data = {"username": username, "password": password}
    
    try:
        login_resp = requests.post(f"{BASE_URL}/login", data=login_data)
    except requests.exceptions.ConnectionError:
        print("[!] Error: Could not connect to server. Is 'uvicorn main:app' running?")
        return

    if login_resp.status_code != 200:
        print("[X] Access Denied: Incorrect username or password.")
        return

    user_info = login_resp.json()
    token = user_info["access_token"]
    user_id = user_info["user_id"]
    has_profile = user_info["has_profile"]
    
    print(f"[+] Access Granted! Welcome, {username}.")
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Check/Initialize Profile
    headers = {"Authorization": f"Bearer {token}"}
    state = None
    
    if not has_profile:
        print("[!] No learning profile found. Let's set it up.")
        current_role = input("Your current role: ")
        target_role = input("Your target role: ")
        
        run_payload = {
            "current_role": current_role,
            "experience_years": 1.0,
            "target_role": target_role,
            "learning_goal": f"Learn {target_role} skills"
        }
        print(f"[*] Sending /run request with token...")
        run_resp = requests.post(f"{BASE_URL}/run", json=run_payload, headers=headers)
        if run_resp.status_code == 200:
            state = run_resp.json()
            print("[+] Curriculum ready!")
        else:
            print(f"[!] Error setting up (Status {run_resp.status_code}): {run_resp.text}")
            return
    else:
        # Fetch existing profile/state
        print("[*] Loading your existing progress...")
        profile_resp = requests.get(f"{BASE_URL}/get-profile", headers=headers)
        
        if profile_resp.status_code != 200:
            print(f"[!] Error fetching profile: {profile_resp.text}")
            return
            
        p_data = profile_resp.json()["profile"]
        run_payload = {
            "current_role": p_data["current_role"],
            "experience_years": p_data["experience_years"],
            "target_role": p_data["target_role"],
            "learning_goal": p_data["learning_goal"]
        }
        print(f"[*] Re-initializing state with token...")
        run_resp = requests.post(f"{BASE_URL}/run", json=run_payload, headers=headers)
        if run_resp.status_code == 200:
            state = run_resp.json()
        else:
            print(f"[!] Error re-running graph: {run_resp.text}")
            return

    # 4. Interactive Chat Loop
    print("\n" + "="*30)
    print("Tutor is online. Type 'exit' to quit.")
    print("="*30)

    while True:
        user_msg = input(f"\n[{username}]: ")
        if user_msg.lower() in ["exit", "quit", "q"]:
            print("Goodbye!")
            break

        chat_payload = {
            "state": state,
            "message": user_msg
        }
        
        try:
            chat_resp = requests.post(f"{BASE_URL}/chat", json=chat_payload, headers=headers)
            if chat_resp.status_code == 200:
                result_state = chat_resp.json()
                # Update our local state with the one returned from the server
                state = result_state
                
                tutor_reply = state["tutor_session"]["content"]
                print(f"\n[Tutor]: {tutor_reply}")
            else:
                print(f"\n[!] Error: {chat_resp.text}")
        except Exception as e:
            print(f"\n[!] Chat Error: {e}")

if __name__ == "__main__":
    interactive_tutor()
